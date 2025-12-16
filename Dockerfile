#**************** FRONTEND ********************
FROM node:20.11.0 as frontend

WORKDIR /app

COPY ./FrontedEscuela/package*.json ./

# Instalar las dependencias
RUN npm install

COPY ./FrontedEscuela ./

# Instalar dependencias de producción y construir
RUN npm i
# Instalar rollup para linux x64
RUN npm install @rollup/rollup-linux-x64-gnu
# Instalar serve para servir archivos estáticos
RUN npm install -g serve

# Configurar variables de entorno para el build
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build
EXPOSE 5173

# CMD ["npm", "start"]

#**************** BACKEND ********************
FROM golang:1.24-alpine as backend

RUN apk add --no-cache git && mkdir -p /home/app

WORKDIR /home/app

# Backend - Copiar solo los archivos necesarios
COPY ./ApiEscuela ./

RUN go mod download && go mod verify && go build -v -o /bin/app ./*.go

EXPOSE 3000


# CMD ["go", "run", "main.go"]