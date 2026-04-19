from fastapi import FastAPI

app = FastAPI(title="catalog-api")


@app.get("/healthz")
def healthz():
    return {"status": "ok"}


@app.get("/api/v1/ping")
def ping():
    return {"service": "catalog-api", "message": "pong"}
