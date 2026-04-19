.PHONY: cluster-up cluster-down test-catalog test-orders test-notifications test-all build-all

cluster-up:
	bash bootstrap/up.sh

cluster-down:
	bash bootstrap/down.sh

test-catalog:
	cd apps/catalog-api && pip install -q -r requirements.txt && pytest tests/ -v

test-orders:
	cd apps/orders-api && go test -v ./...

test-notifications:
	cd apps/notifications-worker && npm test

test-all: test-catalog test-orders test-notifications

build-catalog:
	docker build -t pipeforge/catalog-api:local apps/catalog-api

build-orders:
	docker build -t pipeforge/orders-api:local apps/orders-api

build-notifications:
	docker build -t pipeforge/notifications-worker:local apps/notifications-worker

build-all: build-catalog build-orders build-notifications
