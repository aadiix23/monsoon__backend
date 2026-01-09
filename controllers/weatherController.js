const getRainfallForecast = async (req, res) => {
    try {
        const { lat, lon } = req.query;

        if (!lat || !lon) {
            return res.status(400).json({ error: 'Latitude (lat) and Longitude (lon) are required' });
        }

        // Fetch weather data from Open-Meteo
        // We request hourly rain and daily rain_sum for the next 3 days to cover at least 48 hours effectively
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=rain&daily=rain_sum&timezone=auto&forecast_days=3`;

        const response = await fetch(url, {
            headers: {
                'User-Agent': 'MonsoonMap/1.0'
            }
        });

        if (!response.ok) {
            throw new Error(`Open-Meteo API error: ${response.statusText}`);
        }

        const data = await response.json();

        // Process Hourly Data (Next 48 Hours)
        // The API returns arrays of time and values. 
        const hourlyRain = data.hourly.rain || [];
        const hourlyTime = data.hourly.time || [];

        let maxIntensity = 0;
        let totalRainfall48h = 0;
        const forecast48h = [];

        // We'll take the first 48 hours from the response
        for (let i = 0; i < Math.min(48, hourlyRain.length); i++) {
            const rain = hourlyRain[i];
            forecast48h.push({
                time: hourlyTime[i],
                rain_mm: rain
            });

            if (rain > maxIntensity) {
                maxIntensity = rain;
            }
            totalRainfall48h += rain;
        }

        // Determine Risk Level
        // Logic:
        // Low: Max intensity < 2.5 mm/h
        // Medium: Max intensity >= 2.5 mm/h and < 7.6 mm/h
        // High: Max intensity >= 7.6 mm/h OR Total accumulation > 50mm in 48h (arbitrary heavy rain threshold)

        let riskLevel = 'Low';
        let message = 'No significant rainfall expected.';

        if (maxIntensity >= 7.6 || totalRainfall48h >= 50) {
            riskLevel = 'High';
            message = 'Heavy rainfall expected. Risk of water logging.';
        } else if (maxIntensity >= 2.5) {
            riskLevel = 'Medium';
            message = 'Moderate rainfall expected.';
        } else if (totalRainfall48h > 0) {
            message = 'Light rainfall expected.';
        }

        res.json({
            location: { lat, lon },
            risk_level: riskLevel,
            message: message,
            summary: {
                max_intensity_mm_per_hour: maxIntensity,
                total_rainfall_48h_mm: parseFloat(totalRainfall48h.toFixed(2))
            },
            daily_forecast: data.daily || {},
            hourly_forecast_48h: forecast48h
        });

    } catch (error) {
        console.error('Error fetching weather data:', error);
        res.status(500).json({
            error: 'Internal Server Error fetching weather data',
            details: error.message
        });
    }
};

module.exports = {
    getRainfallForecast
};
