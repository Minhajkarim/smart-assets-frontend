import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import io from 'socket.io-client';
import { BsCamera, BsStopCircle, BsCameraReels } from 'react-icons/bs';
import { FiUpload } from 'react-icons/fi';

const socket = io('http://localhost:5000'); // Backend server URL for Socket.IO

const VideoUpload = () => {
    // State variables
    const [videoFile, setVideoFile] = useState(null);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [processingProgress, setProcessingProgress] = useState(0);
    const [processedVideoUrl, setProcessedVideoUrl] = useState(null);
    const [processedVideos, setProcessedVideos] = useState([]); // New: List of processed videos
    const [isRecording, setIsRecording] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [recordedBlob, setRecordedBlob] = useState(null);
    const [recordTime, setRecordTime] = useState(0);
    const [cameraFacing, setCameraFacing] = useState('environment');

    const videoRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const recordTimerRef = useRef(null);
    const streamRef = useRef(null);

    // Socket.IO listeners
    useEffect(() => {
        socket.on('processingUpdate', (update) => {
            if (update.progress) setProcessingProgress(update.progress);
        });

        socket.on('detectionData', (data) => {
            console.log('Detected objects:', data.objects);
        });

        return () => {
            socket.off('processingUpdate');
            socket.off('detectionData');
        };
    }, []);

    // Switch between front and back cameras
    const switchCamera = () => {
        setCameraFacing((prev) => (prev === 'environment' ? 'user' : 'environment'));
    };

    // Start video recording
    const startRecording = async () => {
        try {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }

            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: cameraFacing },
                audio: true,
            });

            streamRef.current = stream;
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

            recordTimerRef.current = setInterval(() => {
                setRecordTime((prev) => prev + 1);
            }, 1000);
        } catch (error) {
            console.error('Error accessing camera:', error);
        }
    };

    const pauseRecording = () => {
        if (mediaRecorderRef.current) {
            mediaRecorderRef.current.pause();
            setIsPaused(true);
        }
    };

    const resumeRecording = () => {
        if (mediaRecorderRef.current) {
            mediaRecorderRef.current.resume();
            setIsPaused(false);
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            setIsPaused(false);
            clearInterval(recordTimerRef.current);
            setRecordTime(0);
        }
    };

    const saveVideo = () => {
        if (recordedBlob) {
            const url = URL.createObjectURL(recordedBlob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'recorded-video.mp4';
            a.click();
            URL.revokeObjectURL(url);
        }
    };

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
                    console.log('Upload Progress:', progress);
                    setUploadProgress(progress);
                },
            });

            setProcessedVideoUrl(response.data.processedVideo);

            // Update video history
            setProcessedVideos((prev) => [
                ...prev,
                { url: response.data.processedVideo, name: videoFile.name },
            ]);
        } catch (error) {
            console.error('Upload error:', error);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-200 flex flex-col items-center py-10 px-4">
            <h1 className="text-4xl font-extrabold text-gray-800 mb-8">Object Detection</h1>
            <div className="w-full max-w-5xl bg-white shadow-2xl rounded-lg p-8 flex flex-col space-y-8">
                {/* Camera Controls */}
                <div className="space-y-6">
                    <h2 className="text-xl font-semibold">Record Video</h2>
                    <video
                        ref={videoRef}
                        className="w-full h-64 bg-black rounded-lg"
                        autoPlay
                        muted
                    />
                    <div className="flex justify-center gap-4">
                        <button
                            onClick={switchCamera}
                            className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600"
                        >
                            <BsCameraReels /> Switch Camera
                        </button>
                        {!isRecording ? (
                            <button
                                onClick={startRecording}
                                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                            >
                                <BsCamera /> Start Recording
                            </button>
                        ) : isPaused ? (
                            <button
                                onClick={resumeRecording}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                            >
                                Resume Recording
                            </button>
                        ) : (
                            <button
                                onClick={pauseRecording}
                                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                            >
                                <BsStopCircle /> Pause Recording
                            </button>
                        )}
                        {isRecording && !isPaused && (
                            <button
                                onClick={stopRecording}
                                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                            >
                                <BsStopCircle /> Stop Recording
                            </button>
                        )}
                        {isRecording && <p className="text-sm text-gray-700">Recording Time: {recordTime}s</p>}
                    </div>
                </div>

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

                    {/* Upload Progress */}
                    {uploadProgress > 0 && (
                        <div>
                            <div className="relative w-full h-4 bg-gray-300 rounded-lg overflow-hidden">
                                <div
                                    className="absolute h-full bg-blue-600"
                                    style={{ width: `${uploadProgress}%` }}
                                ></div>
                            </div>
                            <p className="text-sm text-gray-700 mt-2">{uploadProgress}% Uploaded</p>
                        </div>
                    )}

                    {/* Processing Progress */}
                    {processingProgress > 0 && (
                        <div className="mt-4">
                            <div className="relative w-full h-4 bg-gray-300 rounded-lg overflow-hidden">
                                <div
                                    className="absolute h-full bg-green-600"
                                    style={{ width: `${processingProgress}%` }}
                                ></div>
                            </div>
                            <p className="text-sm text-gray-700 mt-2">{processingProgress}% Processed</p>
                        </div>
                    )}
                </div>

                {/* Save Recorded Video */}
                <div>
                    {recordedBlob && (
                        <button
                            onClick={saveVideo}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                            Save Recorded Video
                        </button>
                    )}
                </div>

                {/* Processed Videos */}
                <div className="mt-8">
                    <h2 className="text-xl font-semibold">Processed Videos</h2>
                    <ul className="space-y-4">
                        {processedVideos.map((video, index) => (
                            <li key={index} className="flex items-center gap-4">
                                <a
                                    href={video.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 underline"
                                >
                                    {video.name}
                                </a>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default VideoUpload;
