package main

import (
	"reflect"

	"github.com/pkg/errors"
)

// configuration captures the plugin's external configuration as exposed in the Mattermost server
// configuration, as well as values computed from the configuration. Any public fields will be
// deserialized from the Mattermost server configuration in OnConfigurationChange.
type configuration struct {
	MaxDurationSeconds int `json:"MaxDurationSeconds"`
	MaxFileSizeMB      int `json:"MaxFileSizeMB"`
}

// Clone shallow copies the configuration.
func (c *configuration) Clone() *configuration {
	clone := *c
	return &clone
}

// IsValid validates the configuration.
func (c *configuration) IsValid() error {
	if c.MaxDurationSeconds <= 0 {
		return errors.New("MaxDurationSeconds must be greater than 0")
	}
	if c.MaxFileSizeMB <= 0 {
		return errors.New("MaxFileSizeMB must be greater than 0")
	}
	return nil
}

// getConfiguration retrieves the active configuration under lock, making it safe to use
// concurrently. The active configuration may change underneath the client of this method, but
// the struct returned by this API call is considered immutable.
func (p *Plugin) getConfiguration() *configuration {
	p.configurationLock.RLock()
	defer p.configurationLock.RUnlock()

	if p.configuration == nil {
		return &configuration{
			MaxDurationSeconds: 300,
			MaxFileSizeMB:      50,
		}
	}

	return p.configuration
}

// setConfiguration replaces the active configuration under lock.
func (p *Plugin) setConfiguration(configuration *configuration) {
	p.configurationLock.Lock()
	defer p.configurationLock.Unlock()

	if configuration != nil && p.configuration == configuration {
		if reflect.ValueOf(*configuration).NumField() == 0 {
			return
		}
		panic("setConfiguration called with the existing configuration")
	}

	p.configuration = configuration
}

// OnConfigurationChange is invoked when configuration changes may have been made.
func (p *Plugin) OnConfigurationChange() error {
	configuration := new(configuration)

	if err := p.API.LoadPluginConfiguration(configuration); err != nil {
		return errors.Wrap(err, "failed to load plugin configuration")
	}

	// Apply defaults if values are zero/unset
	if configuration.MaxDurationSeconds == 0 {
		configuration.MaxDurationSeconds = 300
	}
	if configuration.MaxFileSizeMB == 0 {
		configuration.MaxFileSizeMB = 50
	}

	p.setConfiguration(configuration)

	return nil
}
