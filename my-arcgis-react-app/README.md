# Fire Safety Map Application

This application combines ArcGIS mapping with a chatbot interface to provide fire safety information and real-time fire data visualization.

## Setup Instructions

1. **Clone the repository**
   ```bash
   git clone https://github.com/madanva/arcgistest.git
   cd arcgistest/my-arcgis-react-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   - Copy the `.env.example` file to create your own `.env` file:
     ```bash
     cp .env.example .env
     ```
   - Open the `.env` file and add your API keys:
     ```
     VITE_WEATHER_API_ENABLED=true
     VITE_WEATHER_API_KEY=your_weather_api_key_here    # Get from weather API provider
     VITE_GEMINI_API_KEY=your_gemini_api_key_here      # Get from Google AI Studio
     ```

4. **Get Required API Keys**
   - Weather API Key: Sign up at [Weather API Provider]
   - Gemini API Key: 
     1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
     2. Create or sign in with your Google account
     3. Generate an API key

5. **Start the development server**
   ```bash
   npm run dev
   ```

## Features

- Interactive map showing active fires and fire perimeters
- Chat interface for location-based fire safety information
- Real-time weather data integration
- AI-powered responses using Google's Gemini API

## Development

This project uses:
- React + Vite for the frontend
- ArcGIS API for mapping
- Google Gemini API for AI responses
- Weather API for real-time conditions

## Environment Variables

The application uses the following environment variables:

- `VITE_WEATHER_API_ENABLED`: Enable/disable weather API integration
- `VITE_WEATHER_API_KEY`: API key for weather data
- `VITE_GEMINI_API_KEY`: Google Gemini API key for AI responses

Make sure to keep your `.env` file secure and never commit it to version control.

## Contributing

1. Create a new branch for your feature
2. Make your changes
3. Ensure you have set up your environment variables
4. Create a pull request

## Note

The `.env` file is ignored by git for security. Always keep your API keys private and never commit them to version control.
