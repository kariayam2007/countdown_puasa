import { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import { Volume2, VolumeX } from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const DisplayPage = () => {
  const [displayState, setDisplayState] = useState(null);
  const [countdown, setCountdown] = useState(null);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const [videoKey, setVideoKey] = useState(0);
  const videoRef = useRef(null);

  const fetchDisplayState = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/display-state`);
      setDisplayState(response.data);
      if (response.data.countdown_seconds) {
        setCountdown(response.data.countdown_seconds);
      }
    } catch (error) {
      console.error("Error fetching display state:", error);
    }
  }, []);

  useEffect(() => {
    fetchDisplayState();
    const interval = setInterval(fetchDisplayState, 30000);
    return () => clearInterval(interval);
  }, [fetchDisplayState]);

  // Countdown timer
  useEffect(() => {
    if (displayState?.state === "countdown" && countdown !== null) {
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            fetchDisplayState();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [displayState?.state, countdown, fetchDisplayState]);

  // Video ended handler - attached directly to video element
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleEnded = () => {
      console.log("Video ended event fired");
      
      const videos = displayState?.current_tvc_videos || [];
      
      if (displayState?.state === "berbuka" || videos.length <= 1) {
        // Single video or berbuka - restart from beginning
        video.currentTime = 0;
        video.play().catch(e => console.log("Replay error:", e));
      } else {
        // Multiple videos - go to next
        setCurrentVideoIndex(prev => {
          const next = (prev + 1) % videos.length;
          console.log("Next video index:", next);
          return next;
        });
        setVideoKey(prev => prev + 1); // Force re-render
      }
    };

    video.addEventListener('ended', handleEnded);
    
    return () => {
      video.removeEventListener('ended', handleEnded);
    };
  }, [displayState]);

  // Load and play video when source changes
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const videoUrl = getCurrentVideoUrl();
    if (!videoUrl) return;

    video.src = videoUrl;
    video.load();
    video.play().catch(e => {
      console.log("Autoplay error, trying muted:", e);
      video.muted = true;
      setIsMuted(true);
      video.play().catch(err => console.log("Still failed:", err));
    });
  }, [currentVideoIndex, videoKey, displayState?.state]);

  // Format countdown time
  const formatCountdown = (seconds) => {
    if (!seconds) return { hours: "00", minutes: "00", secs: "00" };
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return {
      hours: hours.toString().padStart(2, "0"),
      minutes: minutes.toString().padStart(2, "0"),
      secs: secs.toString().padStart(2, "0"),
    };
  };

  const time = formatCountdown(countdown);

  // Handle mute toggle
  const toggleMute = () => {
    if (videoRef.current) {
      const newMutedState = !isMuted;
      videoRef.current.muted = newMutedState;
      setIsMuted(newMutedState);
    }
  };

  // Get current video URL - play TVC in background during countdown too
  const getCurrentVideoUrl = () => {
    if (displayState?.state === "berbuka" && displayState?.berbuka_video?.url) {
      return displayState.berbuka_video.url;
    }
    // Play TVC videos during both "tvc" and "countdown" states
    if (displayState?.current_tvc_videos?.length > 0) {
      return displayState.current_tvc_videos[currentVideoIndex]?.url;
    }
    return null;
  };

  const videoUrl = getCurrentVideoUrl();

  return (
    <div 
      data-testid="display-page"
      className="relative w-screen h-screen overflow-hidden bg-frestea-dark"
    >
      {/* Background Image/Video */}
      <div className="absolute inset-0 z-0">
        {videoUrl ? (
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            autoPlay
            muted={isMuted}
            playsInline
            data-testid="video-player"
          />
        ) : (
          <div 
            className="w-full h-full bg-cover bg-center"
            style={{
              backgroundImage: `url('https://images.unsplash.com/photo-1756999386217-a82d882d407d?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjAzOTB8MHwxfHNlYXJjaHwyfHxhYnN0cmFjdCUyMHB1cnBsZSUyMGFuZCUyMGdyZWVuJTIwZ3JhZGllbnQlMjBsaXF1aWQlMjBiYWNrZ3JvdW5kfGVufDB8fHx8MTc3MDk2MDIyMHww&ixlib=rb-4.1.0&q=85')`
            }}
            data-testid="background-image"
          />
        )}
        {/* Overlay */}
        <div className="absolute inset-0 video-overlay" />
      </div>

      {/* Content Overlay */}
      <div className="relative z-20 flex flex-col items-center justify-center h-full px-4">
        {/* Status Badge & Sound Toggle */}
        <div className="absolute top-8 right-8 flex items-center gap-4">
          {/* Sound Toggle Button */}
          {videoUrl && (
            <button
              onClick={toggleMute}
              className="p-3 rounded-full bg-black/50 hover:bg-black/70 transition-colors"
              data-testid="sound-toggle-btn"
            >
              {isMuted ? (
                <VolumeX className="w-6 h-6 text-white" />
              ) : (
                <Volume2 className="w-6 h-6 text-frestea-green" />
              )}
            </button>
          )}
          <span 
            data-testid="status-badge"
            className={`px-4 py-2 rounded-full text-sm font-bold uppercase tracking-wider ${
              displayState?.state === "tvc" ? "status-tvc" :
              displayState?.state === "countdown" ? "status-countdown" :
              "status-berbuka"
            }`}
          >
            {displayState?.state === "tvc" && "TVC"}
            {displayState?.state === "countdown" && "Countdown"}
            {displayState?.state === "berbuka" && "Berbuka"}
          </span>
        </div>

        {/* Countdown Display */}
        {displayState?.state === "countdown" && (
          <div className="animate-fade-in text-center" data-testid="countdown-display">
            <div className="mb-8">
              <h2 className="font-heading text-4xl md:text-6xl text-frestea-gold tracking-wide">
                Menuju Waktu Berbuka
              </h2>
              <p className="text-lg md:text-xl text-purple-300 mt-2">
                Buka Puasa • Buka Frestea
              </p>
            </div>

            <div className="flex items-center justify-center gap-4 md:gap-8">
              <div className="flex flex-col items-center">
                <span 
                  className="font-mono text-7xl md:text-9xl lg:text-[12rem] text-frestea-gold countdown-glow animate-pulse-slow"
                  data-testid="countdown-hours"
                >
                  {time.hours}
                </span>
                <span className="text-purple-300 text-sm md:text-base uppercase tracking-widest mt-2">Jam</span>
              </div>

              <span className="font-mono text-5xl md:text-7xl lg:text-9xl text-frestea-gold">:</span>

              <div className="flex flex-col items-center">
                <span 
                  className="font-mono text-7xl md:text-9xl lg:text-[12rem] text-frestea-gold countdown-glow animate-pulse-slow"
                  data-testid="countdown-minutes"
                >
                  {time.minutes}
                </span>
                <span className="text-purple-300 text-sm md:text-base uppercase tracking-widest mt-2">Menit</span>
              </div>

              <span className="font-mono text-5xl md:text-7xl lg:text-9xl text-frestea-gold">:</span>

              <div className="flex flex-col items-center">
                <span 
                  className="font-mono text-7xl md:text-9xl lg:text-[12rem] text-frestea-gold countdown-glow animate-pulse-slow"
                  data-testid="countdown-seconds"
                >
                  {time.secs}
                </span>
                <span className="text-purple-300 text-sm md:text-base uppercase tracking-widest mt-2">Detik</span>
              </div>
            </div>

            {displayState?.maghrib_time && (
              <div className="mt-12">
                <p className="text-purple-300 text-lg">
                  Waktu Maghrib: <span className="text-frestea-green font-bold">{displayState.maghrib_time}</span> WIB
                </p>
              </div>
            )}
          </div>
        )}

        {/* Berbuka Message */}
        {displayState?.state === "berbuka" && (
          <div className="animate-fade-in text-center" data-testid="berbuka-display">
            <h1 className="font-heading text-6xl md:text-8xl lg:text-9xl text-frestea-gold countdown-glow">
              Selamat Berbuka!
            </h1>
            <p className="text-2xl md:text-3xl text-frestea-green mt-6">
              Buka Puasa • Buka Frestea
            </p>
          </div>
        )}

        {/* TVC Mode - Show brand */}
        {displayState?.state === "tvc" && (
          <div className="animate-fade-in text-center" data-testid="tvc-display">
            <h1 className="font-heading text-5xl md:text-7xl text-white">
              Frestea
            </h1>
            <p className="text-xl md:text-2xl text-frestea-green mt-4">
              Berasa Refresh Beneran
            </p>
            {displayState?.maghrib_time && (
              <p className="text-purple-300 text-base mt-8">
                Waktu Maghrib Hari Ini: <span className="text-frestea-gold font-bold">{displayState.maghrib_time}</span> WIB
              </p>
            )}
          </div>
        )}

        {/* No Schedule Message */}
        {!displayState?.maghrib_time && displayState?.state === "tvc" && (
          <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2">
            <p className="text-purple-400 text-sm">
              Belum ada jadwal maghrib untuk hari ini
            </p>
          </div>
        )}
      </div>

      {/* Admin Link */}
      <a 
        href="/login" 
        className="absolute bottom-4 right-4 text-purple-500 hover:text-purple-300 text-sm transition-colors z-30"
        data-testid="admin-link"
      >
        Admin Panel →
      </a>
    </div>
  );
};

export default DisplayPage;
