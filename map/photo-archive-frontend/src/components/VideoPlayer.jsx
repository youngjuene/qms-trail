import React, { useRef, useState } from 'react';
import './VideoPlayer.css';

/**
 * VideoPlayer Component
 * Displays a video with playback controls
 *
 * @param {Object} props
 * @param {string} props.src - Video source URL
 * @param {string} props.poster - Thumbnail/poster image URL
 * @param {string} props.className - Additional CSS classes
 * @param {boolean} props.autoPlay - Auto play video
 * @param {boolean} props.controls - Show native controls
 */
function VideoPlayer({
  src,
  poster,
  className = '',
  autoPlay = false,
  controls = true,
  muted = false,
  loop = false,
}) {
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState(null);

  const handlePlayPause = () => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play();
        setIsPlaying(true);
      } else {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    }
  };

  const handleError = (e) => {
    console.error('Video playback error:', e);
    setError('Failed to load video');
  };

  return (
    <div className={`video-player ${className}`}>
      {error ? (
        <div className="video-player__error">
          <p>{error}</p>
        </div>
      ) : (
        <>
          <video
            ref={videoRef}
            className="video-player__video"
            src={src}
            poster={poster}
            autoPlay={autoPlay}
            controls={controls}
            muted={muted}
            loop={loop}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onError={handleError}
            playsInline
          />

          {!controls && (
            <button
              className="video-player__play-button"
              onClick={handlePlayPause}
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>
          )}
        </>
      )}
    </div>
  );
}

export default VideoPlayer;
