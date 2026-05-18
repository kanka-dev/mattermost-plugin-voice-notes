package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"regexp"
	"time"

	"github.com/gorilla/mux"
	"github.com/mattermost/mattermost/server/public/model"
)

const (
	postTypeVoiceNote = "custom_voice_note"
	pluginID          = "com.kanka-dev.voice-notes"
)

var rePostID = regexp.MustCompile(`^[A-Za-z0-9]{26}$`)

// initRouter sets up all HTTP routes for the plugin API.
func (p *Plugin) initRouter() *mux.Router {
	r := mux.NewRouter()
	apiV1 := r.PathPrefix("/api/v1").Subrouter()

	apiV1.HandleFunc("/config", p.handleGetConfig).Methods(http.MethodGet)
	apiV1.HandleFunc("/upload", p.handleUpload).Methods(http.MethodPost)
	apiV1.HandleFunc("/audio/{postId}", p.handleGetAudio).Methods(http.MethodGet)

	return r
}

// requireUser is a helper that reads the Mattermost-User-Id header and returns
// an error if it is missing (i.e. the request is unauthenticated).
func requireUser(w http.ResponseWriter, r *http.Request) (string, bool) {
	userID := r.Header.Get("Mattermost-User-Id")
	if userID == "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return "", false
	}
	return userID, true
}

// handleGetConfig returns the current plugin configuration to the webapp.
func (p *Plugin) handleGetConfig(w http.ResponseWriter, r *http.Request) {
	if _, ok := requireUser(w, r); !ok {
		return
	}

	config := p.getConfiguration()
	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(config); err != nil {
		p.API.LogError("Failed to encode config response", "err", err.Error())
	}
}

// handleUpload receives a raw audio blob (WebM/Opus) from the webapp,
// uploads it to Mattermost file storage, and creates a custom voice-note post.
func (p *Plugin) handleUpload(w http.ResponseWriter, r *http.Request) {
	userID, ok := requireUser(w, r)
	if !ok {
		return
	}

	channelID := r.URL.Query().Get("channel_id")
	if channelID == "" {
		http.Error(w, "channel_id is required", http.StatusBadRequest)
		return
	}

	// Verify the user has permission to post in this channel.
	if !p.API.HasPermissionToChannel(userID, channelID, model.PermissionCreatePost) {
		http.Error(w, "Forbidden", http.StatusForbidden)
		return
	}

	config := p.getConfiguration()
	maxBytes := int64(config.MaxFileSizeMB) * 1024 * 1024

	// Limit body size to configured maximum.
	r.Body = http.MaxBytesReader(w, r.Body, maxBytes)

	audioData, err := io.ReadAll(r.Body)
	if err != nil {
		if err.Error() == "http: request body too large" {
			http.Error(w, fmt.Sprintf("File exceeds maximum allowed size of %d MB", config.MaxFileSizeMB), http.StatusRequestEntityTooLarge)
			return
		}
		p.API.LogError("Failed to read upload body", "err", err.Error())
		http.Error(w, "Failed to read audio data", http.StatusInternalServerError)
		return
	}

	if len(audioData) == 0 {
		http.Error(w, "Empty audio data", http.StatusBadRequest)
		return
	}

	// Validate MIME type – accept WebM/Opus or generic audio/webm.
	contentType := r.Header.Get("Content-Type")
	if contentType == "" {
		contentType = "audio/webm"
	}

	filename := fmt.Sprintf("voice-note-%d.webm", time.Now().UnixMilli())

	// Upload file to Mattermost file storage.
	fileInfo, appErr := p.API.UploadFile(audioData, channelID, filename)
	if appErr != nil {
		p.API.LogError("Failed to upload voice note file", "err", appErr.Error())
		http.Error(w, "Failed to upload audio file", http.StatusInternalServerError)
		return
	}

	// Create a custom post with the voice-note type.
	post := &model.Post{
		UserId:    userID,
		ChannelId: channelID,
		Type:      postTypeVoiceNote,
		Props: model.StringInterface{
			"fileId":      fileInfo.Id,
			"duration_ms": 0, // will be updated if provided
		},
		FileIds: model.StringArray{fileInfo.Id},
	}

	// If the client sent a duration, attach it.
	if durationStr := r.URL.Query().Get("duration_ms"); durationStr != "" {
		post.Props["duration_ms"] = durationStr
	}

	createdPost, appErr := p.API.CreatePost(post)
	if appErr != nil {
		p.API.LogError("Failed to create voice note post", "err", appErr.Error())
		http.Error(w, "Failed to create post", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	if err := json.NewEncoder(w).Encode(map[string]string{
		"post_id": createdPost.Id,
		"file_id": fileInfo.Id,
	}); err != nil {
		p.API.LogError("Failed to encode upload response", "err", err.Error())
	}
}

// handleGetAudio serves the audio file for a given voice-note post ID.
// It checks that the requesting user has read access to the channel.
func (p *Plugin) handleGetAudio(w http.ResponseWriter, r *http.Request) {
	userID, ok := requireUser(w, r)
	if !ok {
		return
	}

	vars := mux.Vars(r)
	postID := vars["postId"]
	if !rePostID.MatchString(postID) {
		http.NotFound(w, r)
		return
	}

	post, appErr := p.API.GetPost(postID)
	if appErr != nil || post.DeleteAt > 0 || post.Type != postTypeVoiceNote {
		http.NotFound(w, r)
		return
	}

	// Verify the user has read permission on the channel.
	if !p.API.HasPermissionToChannel(userID, post.ChannelId, model.PermissionReadChannel) {
		http.Error(w, "Forbidden", http.StatusForbidden)
		return
	}

	fileID, ok := post.Props["fileId"].(string)
	if !ok || fileID == "" {
		http.Error(w, "Bad request: missing fileId", http.StatusBadRequest)
		return
	}

	info, appErr := p.API.GetFileInfo(fileID)
	if appErr != nil {
		http.NotFound(w, r)
		return
	}

	fileData, appErr := p.API.GetFile(fileID)
	if appErr != nil {
		http.NotFound(w, r)
		return
	}

	mimeType := info.MimeType
	if mimeType == "" {
		mimeType = "audio/webm"
	}

	w.Header().Set("Content-Type", mimeType)
	w.Header().Set("X-Frame-Options", "DENY")
	w.Header().Set("Content-Security-Policy", "frame-ancestors 'none'")
	w.Header().Set("Cache-Control", "private, max-age=3600")

	reader := bytes.NewReader(fileData)
	secs := int64(info.UpdateAt / 1000)
	ns := int64((info.UpdateAt - (secs * 1000)) * 1000000)
	http.ServeContent(w, r, info.Name, time.Unix(secs, ns), reader)
}
