import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import io from 'socket.io-client';
import MapComponent from './MapComponent'; // Import the MapComponent

const socket = io('http://localhost:5000'); // Connect to the backend Socket.IO server

const VideoUpload = () => {
    const [videoFile, setVideoFile] = useState(null);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [processingProgress, setProcessingProgress] = useState(0);
    const [processedVideoUrl, setProcessedVideoUrl] = useState(null);
    const [isRecording, setIsRecording] = useState(false);
    const [recordedBlob, setRecordedBlob] = useState(null); // State for recorded video
    const [detectionPreview, setDetectionPreview] = useState(null); // State for detection preview

    // Location and detection state
    const [currentLocation, setCurrentLocation] = useState(null); // User's location
    const [detectedObjects, setDetectedObjects] = useState([]); // Real-time detected objects

    const videoRef = useRef(null);
    const mediaRecorderRef = useRef(null);

    // Fetch user's location
    useEffect(() => {
        if (navigator.geolocation) {
            navigator.geolocation.watchPosition(
                (position) => {
                    setCurrentLocation([position.coords.latitude, position.coords.longitude]);
                },
                (error) => console.error('Error fetching location:', error),
                { enableHighAccuracy: true }
            );
        } else {
            alert('Geolocation is not supported by your browser.');
        }
    }, []);

    // Throttle location updates to prevent frequent changes
    const useThrottledPosition = (position, delay = 5000) => {
        const [throttledPosition, setThrottledPosition] = useState(position);

        useEffect(() => {
            const handler = setTimeout(() => {
                setThrottledPosition(position);
            }, delay);

            return () => clearTimeout(handler);
        }, [position, delay]);

        return throttledPosition;
    };

    const throttledLocation = useThrottledPosition(currentLocation, 5000); // 5-second throttle

    // Listen for processing progress updates and detection previews
    useEffect(() => {
        socket.on('processingUpdate', (update) => {
            if (update.progress) {
                setProcessingProgress(update.progress); // Update the progress bar
            }
            if (update.preview && update.progress % 5 === 0) { // Only update every 5% progress
                setDetectionPreview(`data:image/jpeg;base64,${update.preview}`); // Set preview image
            }
        });

        // Listen for real-time detection data
        socket.on('detectionData', (data) => {
            setDetectedObjects(data.objects); // Update detected objects on the map
        });

        // Clean up the socket connection on component unmount
        return () => {
            socket.off('processingUpdate');
            socket.off('detectionData');
        };
    }, []);

    // Handle file input change for video upload
    const handleFileChange = (e) => {
        setVideoFile(e.target.files[0]);
    };

    // Handle file upload
    const handleUpload = async () => {
        resetProgress();

        const fileToUpload = recordedBlob || videoFile; // Use recorded or uploaded file
        if (!fileToUpload) return alert('Please select or record a video to upload.');

        const formData = new FormData();
        formData.append('video', fileToUpload);

        try {
            const response = await axios.post('http://localhost:5000/api/videos/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                onUploadProgress: (progressEvent) => {
                    setUploadProgress(Math.round((progressEvent.loaded * 100) / progressEvent.total)); // Track upload progress
                },
            });

            setProcessedVideoUrl(response.data.processedVideo); // Set the processed video URL
        } catch (error) {
            console.error('Upload error:', error);
            alert('Failed to upload video.');
        }
    };

    // Reset progress states
    const resetProgress = () => {
        setUploadProgress(0);
        setProcessingProgress(0);
        setDetectionPreview(null);
        setProcessedVideoUrl(null);
    };

    // Start recording video
    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            videoRef.current.srcObject = stream;

            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;

            const chunks = [];
            mediaRecorder.ondataavailable = (e) => chunks.push(e.data);

            mediaRecorder.onstop = () => {
                const blob = new Blob(chunks, { type: 'video/mp4' });
                setRecordedBlob(blob);
                setVideoFile(new File([blob], 'recorded-video.mp4', { type: 'video/mp4' }));
                videoRef.current.srcObject = null;
                stream.getTracks().forEach((track) => track.stop());
            };

            mediaRecorder.start();
            setIsRecording(true);
        } catch (error) {
            console.error('Error accessing camera:', error);
            alert('Could not access your camera.');
        }
    };

    // Stop video recording
    const stopRecording = () => {
        if (mediaRecorderRef.current) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 flex flex-col items-center py-10 px-4">
            <h1 className="text-4xl font-extrabold text-gray-800 mb-12">Video Recording & Processing</h1>
            <div className="w-full max-w-6xl bg-white shadow-xl rounded-lg p-8 flex flex-col lg:flex-row space-y-8 lg:space-y-0 gap-8">
                
                {/* Left side - Video Recording / Upload */}
                <div className="flex-1 space-y-6">
                    <div>
                        <h2 className="text-2xl font-semibold text-gray-700 mb-4">Option 1: Record Video</h2>
                        <video
                            ref={videoRef}
                            className="w-full h-64 border-2 border-gray-300 rounded-lg mb-4"
                            autoPlay
                            muted
                        />
                        <div className="flex gap-6 justify-center">
                            {!isRecording ? (
                                <button
                                    onClick={startRecording}
                                    className="px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition"
                                >
                                    Start Recording
                                </button>
                            ) : (
                                <button
                                    onClick={stopRecording}
                                    className="px-6 py-3 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition"
                                >
                                    Stop Recording
                                </button>
                            )}
                        </div>
                    </div>

                    <div>
                        <h2 className="text-2xl font-semibold text-gray-700 mb-4">Option 2: Upload Video</h2>
                        <input
                            type="file"
                            accept="video/*"
                            onChange={handleFileChange}
                            className="block w-full text-sm text-gray-900 border-2 border-gray-300 rounded-lg cursor-pointer bg-gray-50 focus:outline-none"
                        />
                        <button
                            onClick={handleUpload}
                            className="mt-6 px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition"
                        >
                            Upload & Process Video
                        </button>
                    </div>

                    {uploadProgress > 0 && (
                        <div>
                            <h3 className="text-lg font-medium text-gray-700">Upload Progress</h3>
                            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                                <div
                                    className="bg-blue-600 h-2 rounded-full"
                                    style={{ width: `${uploadProgress}%` }}
                                ></div>
                            </div>
                        </div>
                    )}

                    {processingProgress > 0 && processingProgress < 100 && (
                        <div>
                            <h3 className="text-lg font-medium text-gray-700">Detecting Objects</h3>
                            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                                <div
                                    className="bg-indigo-600 h-2 rounded-full"
                                    style={{ width: `${processingProgress}%` }}
                                ></div>
                            </div>
                            {detectionPreview && (
                                <div className="mt-4">
                                    <h4 className="text-md font-medium text-gray-700">Live Detection Preview:</h4>
                                    <img
                                        src={detectionPreview}
                                        alt="Detection Preview"
                                        className="w-full max-w-sm border-2 border-gray-300 rounded-lg mt-2"
                                    />
                                </div>
                            )}
                        </div>
                    )}

                    {processedVideoUrl && (
                        <div>
                            <h3 className="text-lg font-medium text-gray-700">Processed Video</h3>
                            <video
                                className="w-full max-w-xl mt-4"
                                controls
                                src={processedVideoUrl}
                            ></video>
                        </div>
                    )}
                </div>

                {/* Right side - Map */}
                <div className="flex-1 space-y-6">
                    <h2 className="text-2xl font-semibold text-gray-700 mb-4">Live Map</h2>
                    <MapComponent
                        currentLocation={throttledLocation} // Throttled location
                        detectedObjects={detectedObjects}
                    />
                </div>
            </div>
        </div>
    );
};

export default VideoUpload;
