# pipeforge
Scaffolf. ship, observe, auto-rollback
Progressive delivery platform on Kubernetes. Personal learning project.
Idea
Build a small e-commerce-like system (three services) and practice the full delivery path: GitOps sync, canary releases gated by Prometheus metrics, signed container images, policy-enforced cluster.

Runs locally on kind. No cloud required.
Planned stack
Kubernetes (kind)
ArgoCD + Argo Rollouts
Prometheus, Loki, Tempo, Grafana
Kyverno, External Secrets Operator
Cosign, Trivy, Syft
Terraform (for an optional AWS path later)
Services (planned)
catalog-api — Python / FastAPI
orders-api — Go
notifications-worker — Node.js
Repo layout
pipeforge/

├── apps/

├── platform/

├── infra/

├── docs/

└── Makefile

Most folders are empty for now.
Status
Just started. Nothing deployable yet.

