import React, {useState} from 'react';

import RecordingModal from './RecordingModal';

interface Props {
    channelId: string;
}

const MicIcon = () => (
    <svg
        xmlns='http://www.w3.org/2000/svg'
        width='18'
        height='18'
        viewBox='0 0 24 24'
        fill='currentColor'
        aria-hidden='true'
    >
        <path d='M12 14a3 3 0 0 0 3-3V5a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.93V20H9v2h6v-2h-2v-2.07A7 7 0 0 0 19 11h-2z'/>
    </svg>
);

const RecordButton: React.FC<Props> = ({channelId}) => {
    const [showModal, setShowModal] = useState(false);

    return (
        <>
            <button
                className='style--none post-action'
                aria-label='Record voice note'
                title='Record voice note'
                onClick={() => setShowModal(true)}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '4px 6px',
                    borderRadius: '4px',
                    opacity: 0.7,
                    cursor: 'pointer',
                }}
            >
                <MicIcon/>
            </button>
            {showModal && (
                <RecordingModal
                    channelId={channelId}
                    onClose={() => setShowModal(false)}
                />
            )}
        </>
    );
};

export default RecordButton;
