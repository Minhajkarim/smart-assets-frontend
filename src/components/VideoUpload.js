import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import io from 'socket.io-client';
import { BsCamera, BsStopCircle } from 'react-icons/bs';
import { FiUpload } from 'react-icons/fi';

const socket = io('http://localhost:5000'); // Backend server URL for Socket.IO

const VideoUpload = () => {
    const [videoFile, setVideoFile] = useState(null);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [processingProgress, setProcessingProgress] = useState(0);
    const [processedVideos, setProcessedVideos] = useState([]);
    const [isRecording, setIsRecording] = useState(false);
    const [mediaStream, setMediaStream] = useState(null);
    const [mediaRecorder, setMediaRecorder] = useState(null);
    const [recordedChunks, setRecordedChunks] = useState([]);
    const [detectedObjects, setDetectedObjects] = useState([]);
    
    const videoRef = useRef(null);

    // Fetch processed videos from the backend
    useEffect(() => {
        const fetchProcessedVideos = async () => {
            try {
                const response = await axios.get('http://localhost:5000/api/videos');
                setProcessedVideos(response.data);
            } catch (error) {
                console.error('Error fetching processed videos:', error);
            }
        };

        fetchProcessedVideos();
    }, []);

    // Socket.IO listeners
    useEffect(() => {
        socket.on('processingUpdate', (update) => {
            if (update.progress) setProcessingProgress(update.progress);
        });

        socket.on('objectDetection', (data) => {
            // Update the list of detected objects in real-time
            setDetectedObjects(data.objects);
        });

        return () => {
            socket.off('processingUpdate');
            socket.off('objectDetection');
        };
    }, []);

    // Start recording video
    const startRecording = async () => {
        try {
            const constraints = {
                video: {
                    facingMode: 'environment', // Use back camera if available
                    width: { ideal: 1920 },
                    height: { ideal: 1080 },
                    aspectRatio: 16 / 9, // Enforce landscape
                },
                audio: true,
            };

            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            setMediaStream(stream);

            const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
            setMediaRecorder(recorder);

            recorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    setRecordedChunks((prev) => [...prev, event.data]);

                    // Send the video chunks (frames) to the backend for object detection
                    socket.emit('frameData', event.data); // Sending frame data to backend
                }
            };

            recorder.start(100); // Record in small chunks (100ms)
            setIsRecording(true);

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
        } catch (error) {
            console.error('Error accessing media devices:', error);
        }
    };

    // Stop recording video
    const stopRecording = () => {
        if (mediaRecorder) {
            mediaRecorder.stop();
        }
        if (mediaStream) {
            mediaStream.getTracks().forEach((track) => track.stop());
        }
        setIsRecording(false);
    };

    // Save the recorded video
    useEffect(() => {
        if (recordedChunks.length > 0) {
            const blob = new Blob(recordedChunks, { type: 'video/webm' });
            const file = new File([blob], `recorded-${Date.now()}.webm`, { type: 'video/webm' });
            setVideoFile(file);
        }
    }, [recordedChunks]);

    const handleUpload = async () => {
        if (!videoFile) {
            return alert('Please select or record a video to upload.');
        }

        const formData = new FormData();
        formData.append('video', videoFile);

        try {
            const response = await axios.post('http://localhost:5000/api/videos/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                onUploadProgress: (progressEvent) => {
                    const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    setUploadProgress(progress);
                },
            });

            console.log('Upload successful:', response.data);
            setVideoFile(null);
        } catch (error) {
            console.error('Error uploading video:', error);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-200 flex flex-col items-center py-10 px-4">
            <h1 className="text-4xl font-extrabold text-gray-800 mb-8">Object Detection</h1>
            <div className="w-full max-w-5xl bg-white shadow-2xl rounded-lg p-8 flex flex-col space-y-8">
                {/* Record Video Section */}
                <div className="space-y-6">
                    <h2 className="text-xl font-semibold">Record Video</h2>
                    <div className="relative w-full h-64 bg-black rounded-lg overflow-hidden">
                        <video
                            ref={videoRef}
                            className="absolute top-0 left-0 w-full h-full object-cover"
                            autoPlay
                            muted
                        ></video>
                        {!isRecording ? (
                            <button
                                onClick={startRecording}
                                className="absolute bottom-4 left-4 bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700"
                            >
                                <BsCamera /> Start Recording
                            </button>
                        ) : (
                            <button
                                onClick={stopRecording}
                                className="absolute bottom-4 left-4 bg-red-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-red-700"
                            >
                                <BsStopCircle /> Stop Recording
                            </button>
                        )}
                    </div>
                </div>

                {/* Display Detected Objects */}
                {detectedObjects.length > 0 && (
                    <div className="space-y-4">
                        <h2 className="text-xl font-semibold">Detected Objects</h2>
                        <ul>
                            {detectedObjects.map((object, index) => (
                                <li key={index} className="text-gray-800">
                                    {object}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* Upload Video Section */}
                <div className="space-y-6">
                    <h2 className="text-xl font-semibold">Upload Video</h2>
                    <input
                        type="file"
                        accept="video/*"
                        onChange={(e) => setVideoFile(e.target.files[0])}
                        className="block w-full text-sm text-gray-900 border-2 border-gray-300 rounded-lg cursor-pointer bg-gray-50 focus:outline-none"
                    />
                    <button
                        onClick={handleUpload}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                        <FiUpload /> Upload & Process
                    </button>
                </div>
            </div>
        </div>
    );
};

export default VideoUpload;
