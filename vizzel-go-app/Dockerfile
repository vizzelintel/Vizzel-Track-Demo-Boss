FROM node:22-alpine AS web
WORKDIR /src
COPY webapp/package.json ./webapp/
RUN cd webapp && npm install
COPY webapp ./webapp
RUN cd webapp && npm run build

FROM golang:1.24-alpine AS build
WORKDIR /src
RUN apk add --no-cache git
COPY go.mod go.sum ./
RUN go mod download
COPY . .
COPY --from=web /src/internal/spa/dist ./internal/spa/dist
RUN CGO_ENABLED=0 go build -ldflags="-s -w" -o /out/server ./cmd/server

FROM alpine:3.20
WORKDIR /app
RUN apk add --no-cache ca-certificates
COPY --from=build /out/server ./server
COPY supabase/migrations ./supabase/migrations
ENV ADDR=:8080
EXPOSE 8080
CMD ["./server"]
