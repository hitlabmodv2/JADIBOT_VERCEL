
FROM node:21-alpine

# Install ffmpeg and ImageMagick
RUN apk add --no-cache \
    ffmpeg \
    imagemagick \
    python3 \
    make \
    g++ \
    libc6-compat

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Create temp directory
RUN mkdir -p temp

# Create session directory if it doesn't exist
RUN mkdir -p session

# Expose port (Railway will assign PORT environment variable)
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
