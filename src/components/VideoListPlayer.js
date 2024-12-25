import React, { useEffect, useState } from 'react';
import axios from 'axios';

const VideoListPlayer = () => {
    const [videos, setVideos] = useState([]); // List of processed videos
    const [selectedVideo, setSelectedVideo] = useState(null); // Currently selected video to play
    const [loading, setLoading] = useState(true); // Loading state for fetching videos
    const [error, setError] = useState(null); // Error state

    // Fetch processed videos on component mount
    useEffect(() => {
        const fetchVideos = async () => {
            try {
                const response = await axios.get('http://localhost:5000/api/videos'); // Backend endpoint
                setVideos(response.data); // Save videos to state
                setLoading(false); // Stop loading
            } catch (err) {
                console.error('Error fetching videos:', err);
                setError('Failed to load videos. Please try again later.');
                setLoading(false);
            }
        };

        fetchVideos();
    }, []);

    return (
        <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
            <h1 style={{ textAlign: 'center', marginBottom: '20px' }}>Processed Videos</h1>

            {/* Error Message */}
            {error && (
                <div style={{ color: 'red', textAlign: 'center', marginBottom: '20px' }}>
                    {error}
                </div>
            )}

            {/* Video List */}
            <div style={{ marginBottom: '20px' }}>
                {loading ? (
                    <p>Loading videos...</p>
                ) : videos.length === 0 ? (
                    <p>No processed videos available.</p>
                ) : (
                    <ul style={{ listStyleType: 'none', padding: 0 }}>
                        {videos.map((video) => (
                            <li
                                key={video._id}
                                style={{
                                    marginBottom: '10px',
                                    padding: '10px',
                                    border: '1px solid #ddd',
                                    borderRadius: '5px',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                }}
                            >
                                <span>{video.filename}</span>
                                <div>
                                    <button
                                        style={{
                                            marginRight: '10px',
                                            padding: '5px 10px',
                                            backgroundColor: '#007bff',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '5px',
                                            cursor: 'pointer',
                                        }}
                                        onClick={() => setSelectedVideo(video)}
                                    >
                                        Play Video
                                    </button>
                                    <a
                                        href={`http://localhost:5000${video.processedPath}`}
                                        download={video.filename}
                                        style={{
                                            padding: '5px 10px',
                                            backgroundColor: '#28a745',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '5px',
                                            textDecoration: 'none',
                                            cursor: 'pointer',
                                        }}
                                    >
                                        Download
                                    </a>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {/* Video Player */}
            {selectedVideo && (
                <div style={{ marginTop: '20px', textAlign: 'center' }}>
                    <h2>Now Playing: {selectedVideo.filename}</h2>
                    <video
                        width="100%"
                        height="auto"
                        controls
                        autoPlay
                        preload="metadata" // Preload metadata for better playback experience
                        src={`http://localhost:5000${selectedVideo.processedPath}`} // Correct video path
                        style={{
                            marginTop: '10px',
                            borderRadius: '10px',
                            border: '1px solid #ddd',
                        }}
                    >
                        Your browser does not support the video tag.
                    </video>
                    <button
                        style={{
                            marginTop: '10px',
                            padding: '10px 20px',
                            backgroundColor: '#dc3545',
                            color: 'white',
                            border: 'none',
                            borderRadius: '5px',
                            cursor: 'pointer',
                        }}
                        onClick={() => setSelectedVideo(null)}
                    >
                        Close Player
                    </button>
                </div>
            )}
        </div>
    );
};

export default VideoListPlayer;
