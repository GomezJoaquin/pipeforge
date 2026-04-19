#!/usr/bin/env bash
set -euo pipefail

echo "Installing ArgoCD..."
kubectl create namespace argocd --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/v2.13.3/manifests/install.yaml

echo "Waiting for ArgoCD server to be ready..."
kubectl wait --for=condition=available deployment/argocd-server -n argocd --timeout=120s

echo ""
echo "ArgoCD installed. Getting initial admin password..."
echo "Password: $(kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath='{.data.password}' | base64 -d)"
echo ""
echo "To access the UI, run:"
echo "  kubectl port-forward svc/argocd-server -n argocd 8443:443"
echo "Then open https://localhost:8443 (user: admin)"
