#**************** FRONTEND ********************
FROM node:20.11.0 as frontend

WORKDIR /app

COPY ./FrontedEscuela/package*.json ./

# Instalar las dependencias
RUN npm install

COPY ./FrontedEscuela ./

EXPOSE 3000
EXPOSE 8080

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

# CMD ["npm", "start"]

#**************** BACKEND ********************
FROM golang:1.24-alpine as backend

RUN apk add --no-cache git

RUN mkdir -p /home/app
WORKDIR /home/app

# Backend
COPY ./ApiEscuela /home/app
COPY ./ApiEscuela/assets/images /home/app/assets/images
COPY ./ApiEscuela/main.go /home/app
COPY ./ApiEscuela/go.mod /home/app
COPY ./ApiEscuela/go.sum /home/app

RUN go mod download && go mod verify
RUN go build -v -o /bin/app ./*.go

EXPOSE 3000

# CMD ["go", "run", "main.go"]