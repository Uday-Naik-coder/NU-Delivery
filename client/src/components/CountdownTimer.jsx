import React, { useState, useEffect, useRef } from 'react';

const CountdownTimer = ({ targetTime, onExpire, className = '' }) => {
  const [timeRemaining, setTimeRemaining] = useState({
    minutes: 0,
    seconds: 0,
    totalSeconds: 0,
    isExpired: false
  });
  
  const intervalRef = useRef(null);
  const hasExpiredRef = useRef(false);

  useEffect(() => {
    const calculateTimeRemaining = () => {
      const now = new Date().getTime();
      const target = new Date(targetTime).getTime();
      const difference = target - now;

      if (difference <= 0) {
        if (!hasExpiredRef.current) {
          hasExpiredRef.current = true;
          setTimeRemaining({
            minutes: 0,
            seconds: 0,
            totalSeconds: 0,
            isExpired: true
          });
          onExpire?.();
        }
        return null;
      }

      const totalSeconds = Math.floor(difference / 1000);
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;

      return {
        minutes,
        seconds,
        totalSeconds,
        isExpired: false
      };
    };

    // Initial calculation
    const initialTime = calculateTimeRemaining();
    if (initialTime) {
      setTimeRemaining(initialTime);
    }

    // Set up interval
    intervalRef.current = setInterval(() => {
      const time = calculateTimeRemaining();
      if (time) {
        setTimeRemaining(time);
      } else {
        clearInterval(intervalRef.current);
      }
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [targetTime, onExpire]);

  const formatNumber = (num) => num.toString().padStart(2, '0');

  const getUrgencyColor = () => {
    if (timeRemaining.totalSeconds < 900) { // Less than 15 minutes
      return 'text-urgent-600 animate-pulse';
    }
    if (timeRemaining.totalSeconds < 1800) { // Less than 30 minutes
      return 'text-orange-500';
    }
    return 'text-gray-700';
  };

  if (timeRemaining.isExpired) {
    return (
      <span className={`text-gray-500 font-medium ${className}`}>
        Expired
      </span>
    );
  }

  return (
    <div className={`font-mono font-bold ${getUrgencyColor()} ${className}`}>
      {formatNumber(timeRemaining.minutes)}:{formatNumber(timeRemaining.seconds)}
    </div>
  );
};

export default CountdownTimer;