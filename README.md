# Pipeforge

**Scaffold, ship, observe, auto-rollback.**

Progressive delivery platform on Kubernetes. Simulates the internal platform of a mid-size e-commerce company migrating from manual deploys to a modern Kubernetes-based delivery pipeline.

## Services

| Service | Language | Port | Description |
|---------|----------|------|-------------|
| catalog-api | Python / FastAPI | 8000 | Product catalog reads |
| orders-api | Go | 8080 | Cart and order management |
| notifications-worker | Node.js | 3000 | Event consumer, email simulation |

## Quick start

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- [kind](https://kind.sigs.k8s.io/docs/user/quick-start/#installation)
- [kubectl](https://kubernetes.io/docs/tasks/tools/)

### Create the cluster

```bash
make cluster-up
```

This creates a kind cluster named `pipeforge` with 1 control-plane + 2 worker nodes.

### Run tests

```bash
make test-all
```

### Build images

```bash
make build-all
```

### Tear down

```bash
make cluster-down
```

## Repo layout

```
pipeforge/
├── apps/
│   ├── catalog-api/          # Python / FastAPI
│   ├── orders-api/           # Go
│   └── notifications-worker/ # Node.js
├── bootstrap/
│   ├── up.sh                 # Create kind cluster
│   ├── down.sh               # Delete kind cluster
│   └── kind-config.yaml      # Cluster topology
├── platform/                 # (coming) ArgoCD, Prometheus, etc.
├── infra/                    # (coming) Terraform
├── docs/                     # ADRs, runbooks, postmortems
├── .github/workflows/ci.yaml
└── Makefile
```
