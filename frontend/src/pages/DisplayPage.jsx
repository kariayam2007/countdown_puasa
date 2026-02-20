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
  const videoRef = useRef(null);

  // Fetch display state
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

  // Get video URL based on state
  const getVideoUrl = () => {
    // Countdown state = NO VIDEO, only countdown display
    if (displayState?.state === "countdown") {
      return null;
    }
    // Berbuka state = Berbuka video only
    if (displayState?.state === "berbuka" && displayState?.berbuka_video?.url) {
      return displayState.berbuka_video.url;
    }
    // TVC state = TVC videos
    if (displayState?.state === "tvc" && displayState?.current_tvc_videos?.length > 0) {
      return displayState.current_tvc_videos[currentVideoIndex]?.url;
    }
    return null;
  };

  const videoUrl = getVideoUrl();
  const videoCount = displayState?.current_tvc_videos?.length || 0;

  // Handle video ended - loop video
  const handleVideoEnded = () => {
    if (displayState?.state === "berbuka") {
      // Berbuka - restart video
      if (videoRef.current) {
        videoRef.current.currentTime = 0;
        videoRef.current.play();
      }
    } else if (displayState?.state === "tvc") {
      if (videoCount <= 1) {
        // Single TVC video - restart
        if (videoRef.current) {
          videoRef.current.currentTime = 0;
          videoRef.current.play();
        }
      } else {
        // Multiple TVC videos - next in playlist
        setCurrentVideoIndex((prev) => (prev + 1) % videoCount);
      }
    }
  };

  // Format countdown
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

  // Toggle mute
  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  return (
    <div data-testid="display-page" className="relative w-screen h-screen overflow-hidden bg-frestea-dark">
      
      {/* ============ STATE: COUNTDOWN ============ */}
      {/* Dari Subuh sampai Maghrib - HANYA COUNTDOWN, tanpa video */}
      {displayState?.state === "countdown" && (
        <div className="absolute inset-0 z-0">
          {/* Background gradient */}
          <div 
            className="w-full h-full"
            style={{
              background: "radial-gradient(ellipse at center, #1A0B2E 0%, #0F0518 70%)"
            }}
          />
          
          {/* Countdown Content */}
          <div className="absolute inset-0 flex flex-col items-center justify-center px-4">
            {/* Location */}
            {displayState?.location && (
              <div className="mb-4">
                <span className="text-purple-400 text-lg uppercase tracking-widest">
                  {displayState.location}
                </span>
              </div>
            )}
            
            {/* Header */}
            <div className="mb-8 text-center">
              <h2 className="font-heading text-4xl md:text-6xl text-frestea-gold tracking-wide">
                Menuju Waktu Berbuka
              </h2>
              <p className="text-lg md:text-xl text-purple-300 mt-2">
                Buka Puasa • Buka Frestea
              </p>
            </div>

            {/* Countdown Timer */}
            <div className="flex items-center justify-center gap-4 md:gap-8">
              <div className="flex flex-col items-center">
                <span className="font-mono text-7xl md:text-9xl lg:text-[12rem] text-frestea-gold countdown-glow" data-testid="countdown-hours">
                  {time.hours}
                </span>
                <span className="text-purple-300 text-sm md:text-base uppercase tracking-widest mt-2">Jam</span>
              </div>
              <span className="font-mono text-5xl md:text-7xl lg:text-9xl text-frestea-gold">:</span>
              <div className="flex flex-col items-center">
                <span className="font-mono text-7xl md:text-9xl lg:text-[12rem] text-frestea-gold countdown-glow" data-testid="countdown-minutes">
                  {time.minutes}
                </span>
                <span className="text-purple-300 text-sm md:text-base uppercase tracking-widest mt-2">Menit</span>
              </div>
              <span className="font-mono text-5xl md:text-7xl lg:text-9xl text-frestea-gold">:</span>
              <div className="flex flex-col items-center">
                <span className="font-mono text-7xl md:text-9xl lg:text-[12rem] text-frestea-gold countdown-glow" data-testid="countdown-seconds">
                  {time.secs}
                </span>
                <span className="text-purple-300 text-sm md:text-base uppercase tracking-widest mt-2">Detik</span>
              </div>
            </div>

            {/* Prayer Times Info */}
            <div className="mt-12 text-center">
              {displayState?.subuh_time && (
                <p className="text-purple-400 text-base">
                  Subuh: <span className="text-white font-bold">{displayState.subuh_time}</span> WIB
                </p>
              )}
              {displayState?.maghrib_time && (
                <p className="text-purple-300 text-lg mt-2">
                  Maghrib: <span className="text-frestea-green font-bold">{displayState.maghrib_time}</span> WIB
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============ STATE: BERBUKA ============ */}
      {/* Setelah Maghrib - HANYA VIDEO BERBUKA, tanpa tulisan apapun */}
      {displayState?.state === "berbuka" && (
        <div className="absolute inset-0 z-0">
          {videoUrl ? (
            <video
              ref={videoRef}
              key="berbuka-video"
              src={videoUrl}
              className="w-full h-full object-cover"
              autoPlay
              muted={isMuted}
              playsInline
              onEnded={handleVideoEnded}
              data-testid="berbuka-video-player"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-frestea-dark">
              <p className="text-frestea-gold text-2xl">Video Berbuka tidak tersedia</p>
            </div>
          )}
          
          {/* Sound Toggle - only control, no text */}
          {videoUrl && (
            <button
              onClick={toggleMute}
              className="absolute top-8 right-8 p-3 rounded-full bg-black/50 hover:bg-black/70 transition-colors z-10"
              data-testid="sound-toggle-btn"
            >
              {isMuted ? (
                <VolumeX className="w-6 h-6 text-white" />
              ) : (
                <Volume2 className="w-6 h-6 text-frestea-green" />
              )}
            </button>
          )}
        </div>
      )}

      {/* ============ STATE: TVC ============ */}
      {/* Setelah Berbuka selesai - VIDEO TVC looping */}
      {displayState?.state === "tvc" && (
        <div className="absolute inset-0 z-0">
          {videoUrl ? (
            <video
              ref={videoRef}
              key={`tvc-video-${currentVideoIndex}`}
              src={videoUrl}
              className="w-full h-full object-cover"
              autoPlay
              muted={isMuted}
              playsInline
              onEnded={handleVideoEnded}
              data-testid="tvc-video-player"
            />
          ) : (
            <div 
              className="w-full h-full flex items-center justify-center"
              style={{
                background: "radial-gradient(ellipse at center, #1A0B2E 0%, #0F0518 70%)"
              }}
            >
              <div className="text-center">
                <h1 className="font-heading text-5xl md:text-7xl text-white">Frestea</h1>
                <p className="text-xl md:text-2xl text-frestea-green mt-4">Berasa Refresh Beneran</p>
                {displayState?.maghrib_time && (
                  <p className="text-purple-300 text-base mt-8">
                    Maghrib Hari Ini: <span className="text-frestea-gold font-bold">{displayState.maghrib_time}</span> WIB
                  </p>
                )}
              </div>
            </div>
          )}
          
          {/* Sound Toggle for TVC */}
          {videoUrl && (
            <button
              onClick={toggleMute}
              className="absolute top-8 right-8 p-3 rounded-full bg-black/50 hover:bg-black/70 transition-colors z-10"
              data-testid="sound-toggle-btn"
            >
              {isMuted ? (
                <VolumeX className="w-6 h-6 text-white" />
              ) : (
                <Volume2 className="w-6 h-6 text-frestea-green" />
              )}
            </button>
          )}
        </div>
      )}

      {/* Admin Link - always visible */}
      <a 
        href="/login" 
        className="absolute bottom-4 right-4 text-purple-500 hover:text-purple-300 text-sm z-30 opacity-50 hover:opacity-100 transition-opacity" 
        data-testid="admin-link"
      >
        Admin →
      </a>
    </div>
  );
};

export default DisplayPage;
