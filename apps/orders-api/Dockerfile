FROM golang:1.22-alpine AS build
WORKDIR /src
COPY go.mod .
COPY main.go .
RUN go build -o /orders-api .

FROM gcr.io/distroless/static-debian12
COPY --from=build /orders-api /orders-api
EXPOSE 8080
CMD ["/orders-api"]
