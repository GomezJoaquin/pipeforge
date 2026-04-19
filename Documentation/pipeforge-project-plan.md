  
**Pipeforge**

*Progressive Delivery Platform para microservicios*

Proyecto de portafolio — Platform Engineer / DevOps senior

Escala: \~3 microservicios, 2 entornos, 4–8 semanas part-time, \<$50 USD totales

Autor: Juakin  ·  Perfil objetivo: Platform Engineer / SRE

# **Índice**

# **1\. Nombre del proyecto**

**Pipeforge** — “a progressive delivery platform that turns developer intent into production-grade deployments”.

Slogan técnico para el README: **“Scaffold, ship, observe, auto-rollback.”**

El nombre importa para el portafolio. pipeforge es breve, disponible como handle en GitHub, evoca “foja de pipelines” y no es genérico (my-devops-project comunica lo opuesto a seniority).

# **2\. Problema real que simula**

Pipeforge simula la plataforma interna de **una empresa e-commerce mediana** (tipo marketplace regional) que decidió migrar de deploys manuales a VMs hacia una plataforma moderna sobre Kubernetes. El equipo de plataforma recibe tres dolores concretos:

* **Deploys lentos y riesgosos.** Cada release requiere una ventana de mantenimiento; 1 de cada 5 introduce un incidente detectado recién en horas.

* **Falta de visibilidad.** No hay SLOs. El único indicador es “el dashboard se puso rojo”. MTTR alto porque los runbooks no existen.

* **Onboarding de servicios manual.** Crear un servicio nuevo implica copiar un repo, tocar 6 archivos de CI y pedir secrets por Slack.

La narrativa de portafolio: **“Diseñé una plataforma interna que bajó el lead time from commit to production de 45 minutos a 8, con canary automático y rollback disparado por SLO burn rate. El onboarding de un servicio nuevo pasó de 3 días a 15 minutos.”**

Esta historia es creíble: es un problema que cualquier empresa de producto entre 50 y 500 ingenieros tiene hoy. No es un hello world.

# **3\. Arquitectura general**

Pipeforge es una plataforma sobre Kubernetes con tres planos diferenciados:

### **Plano de aplicación (tenants)**

Tres microservicios de ejemplo que simulan una empresa de e-commerce: catalog-api (lee productos, Python/FastAPI), orders-api (maneja carritos y órdenes, Go), notifications-worker (consume eventos y simula envío de mails, Node.js). Comunicación sync via HTTP, async vía NATS (ligero, cabe en kind sin RAM penalty).

### **Plano de delivery**

GitOps con ArgoCD como único writer del cluster. Argo Rollouts provee canary deployments con **AnalysisTemplates** que consultan Prometheus y disparan rollback si el error rate o latency p95 del canary exceden el baseline durante la fase de análisis.

### **Plano de plataforma**

Observabilidad con kube-prometheus-stack \+ Loki \+ Tempo (trazas). Policy con Kyverno. Secrets con External Secrets Operator (backend SOPS local, SSM Parameter Store en AWS). Supply chain con Trivy \+ Cosign (firma e verificación de imágenes vía ClusterImagePolicy de Kyverno).

# **4\. Stack tecnológico**

| Capa | Herramienta | Por qué esta y no otra |
| :---- | :---- | :---- |
| Cluster local | kind (3 nodos) | Zero cost, reproducible, cabe en 8 GB RAM |
| Cluster cloud (final) | AWS EKS 1.29 | Estándar de mercado; reemplazable por GKE/AKS sin cambiar el código |
| IaC | Terraform \+ módulos propios | Estándar de facto; permite modular repo 'terraform-modules' |
| Contenedores | Docker \+ Buildx \+ distroless bases | Imágenes chicas; reduce superficie de ataque |
| CI | GitHub Actions | Gratis para repos públicos; workflows portables |
| GitOps | ArgoCD (App-of-Apps) | Más maduro que Flux para solo-operator; UI ayuda en entrevistas |
| Progressive delivery | Argo Rollouts | Canary con analysis basada en Prometheus sin escribir operators |
| Métricas | kube-prometheus-stack | Stack de facto; ServiceMonitor CRDs |
| Logs | Loki \+ Promtail | Barato, integra con Grafana, query LogQL similar a PromQL |
| Trazas | Tempo \+ OpenTelemetry SDK | Muestra conocimiento de tracing distribuido, diferenciador |
| Dashboards / alertas | Grafana \+ Alertmanager | Estándar; Alertmanager con receiver a Discord o email |
| Policy | Kyverno | YAML-native, tests con 'kyverno test' |
| Secrets | External Secrets Operator \+ SOPS / AWS SSM | Nunca en Git; rotación sin redeploy |
| Supply chain | Trivy (scan) \+ Cosign (sign) \+ SBOM | Bloqueo de CVE crítico en CI; verificación en admission |
| Chaos | Chaos Mesh (o kubectl scripts) | Demostrar resiliencia probándola |
| Cost optim (cloud) | Karpenter \+ Spot instances | Diferenciador FinOps; ahorra 60–80% en EKS |

# **5\. Diagrama de arquitectura (descrito en texto)**

El README incluirá este diagrama en Mermaid. La descripción textual fluye así:

Un **developer** hace git push sobre el repo de un servicio. **GitHub Actions** ejecuta el pipeline: tests, build de imagen, Trivy para scan de vulnerabilidades, syft para generar SBOM, Cosign para firmar la imagen con keyless signing (OIDC), y push a ECR/GHCR. El mismo workflow abre un PR en un repo separado pipeforge-apps bumpeando el tag de la imagen.

ArgoCD vigila pipeforge-apps y detecta el cambio. En vez de hacer un Deployment update tradicional, crea un Rollout con estrategia canary: 10% del tráfico al nuevo release durante 2 minutos. Un AnalysisTemplate consulta Prometheus preguntando 'la tasa de 5xx del canary es menor que la del stable?' y 'la latencia p95 no excede al baseline en más de 20%?'. Si ambas pasan, escala al 50%, luego 100%. Si fallan, rollback automático.

En paralelo, **Kyverno** verifica en admission que cada Pod que intenta entrar al cluster (a) declara resource limits, (b) tiene liveness y readiness probes, (c) usa imagen firmada con Cosign, (d) no usa tag latest, (e) no corre como root. **External Secrets Operator** inyecta desde SSM/SOPS los secrets que el servicio declara en un ExternalSecret.

La **observabilidad** corre todo el tiempo: cada servicio expone /metrics (Prometheus scrape), loggea JSON estructurado (Loki capta via Promtail), y emite trazas OTLP a Tempo. Grafana muestra un dashboard RED por servicio, uno de SLOs con burn rate, y uno de DORA metrics (lead time, deploy frequency, change failure rate, MTTR). Alertmanager rutea alertas a un canal Discord de prueba.

# **6\. Flujo CI/CD completo**

### **CI (GitHub Actions, por servicio)**

1. Checkout \+ setup del runtime (Python / Go / Node).

2. Lint \+ unit tests. Falla aborta.

3. Build multi-arch de la imagen con docker buildx (amd64 \+ arm64).

4. trivy image \--severity CRITICAL,HIGH \--exit-code 1. CVE crítico aborta.

5. syft genera SBOM (SPDX) como artifact.

6. cosign sign \--yes con OIDC keyless (Fulcio \+ Rekor).

7. Push de la imagen a ghcr.io/\<user\>/pipeforge-\<svc\>:\<sha\>.

8. Action custom bumpea el tag en pipeforge-apps vía PR. El PR se auto-mergea si checks verdes.

### **CD (ArgoCD \+ Argo Rollouts)**

1. ArgoCD detecta el cambio en el Rollout manifest y dispara el canary.

2. Rollout avanza en fases: 10% → pausa 2 min → analysis → 50% → pausa 2 min → analysis → 100%.

3. Cada pausa ejecuta un AnalysisRun sobre Prometheus con 2 métricas: success rate \> 99% y latency p95 \< baseline × 1.2.

4. Si alguna analysis falla: rollback automático al revision anterior y alerta en Discord.

5. El revision anterior queda retenida durante 6h para rollback manual si se detecta un problema latente.

Métricas DORA expuestas en un dashboard dedicado, calculadas desde los eventos de ArgoCD y los commits:

* lead\_time\_for\_changes (commit → production, mediana)

* deployment\_frequency (deploys/día por servicio)

* change\_failure\_rate (% de rollouts que rolled back)

* mttr (tiempo desde alerta hasta clear)

# **7\. Infraestructura como código**

### **Repo terraform-modules (módulos reutilizables)**

| Módulo | Qué crea | Uso desde Pipeforge |
| :---- | :---- | :---- |
| modules/network/vpc | VPC multi-AZ, subnets pub/priv, NAT, VPC endpoints | Base de red en AWS |
| modules/compute/eks | EKS 1.29 con node groups, IRSA, OIDC, add-ons base | Cluster cloud final |
| modules/compute/karpenter | Karpenter \+ NodeClass \+ NodePools spot/on-demand | Autoscaling cost-aware |
| modules/security/iam-baseline | Rol ReadOnlyAudit, BreakGlass con MFA, IRSA service accounts | Seguridad base |
| modules/data/ecr | Repos ECR por servicio con lifecycle policy | Registry de imágenes |

### **Repo pipeforge (consumo de módulos)**

infra/envs/local/ no usa Terraform (kind via script). infra/envs/aws-dev/ consume los módulos con source \= "git::github.com/\<user\>/terraform-modules//modules/\<x\>?ref=v0.1.0". Estado remoto en S3 \+ DynamoDB lock creado en bootstrap/ one-shot.

Principio: **en el repo pipeforge no hay recursos AWS inline**. Todo pasa por módulos versionados. Esto es evidencia directa de mindset Platform Engineer en una entrevista.

# **8\. Observabilidad (logs, métricas, alertas)**

### **Métricas**

Cada servicio expone /metrics en formato Prometheus. Un ServiceMonitor por servicio define scrape interval 15s. Métricas obligatorias (**RED method**):

* http\_requests\_total{service,method,status} — Rate

* http\_request\_duration\_seconds\_bucket{...} — Duration histogram

* http\_requests\_total{status=\~"5.."} — Errors

### **Logs**

JSON estructurado (timestamp, level, service, trace\_id, request\_id, msg). Promtail descubre pods automáticamente, etiqueta por app.kubernetes.io/name y envía a Loki.

### **Trazas**

OpenTelemetry SDK en cada servicio con propagación W3C Trace Context. Exportador OTLP a un otel-collector DaemonSet que reenvía a Tempo. Los dashboards de Grafana linkean traces ↔ logs ↔ métricas por trace\_id.

### **SLOs**

| Servicio | SLI | Objetivo (30d) | Burn rate alerts |
| :---- | :---- | :---- | :---- |
| catalog-api | Availability (non-5xx) | 99.5% | 2% en 1h / 5% en 6h |
| catalog-api | Latency p95 | \< 250 ms | Slow burn on 5% budget |
| orders-api | Availability | 99.9% | Crítico: 1% en 5m |
| orders-api | Latency p99 | \< 800 ms | Slow burn |
| notifications-worker | Event lag | \< 30 s p95 | Fast burn en backlog |

### **Alertas**

Alertmanager con grupos por severidad. Receiver default: Discord webhook. Las alertas de SLO burn rate usan la **multi-window multi-burn-rate** pattern del Google SRE Workbook. Alertas de infra (nodo Unhealthy, control plane latency) van a un grupo separado.

# **9\. Seguridad (controles mínimos reales)**

### **Supply chain**

* **Imagen scanning**: Trivy en CI con bloqueo en CVE CRITICAL/HIGH conocidas.

* **SBOM por release**: archivo SPDX subido como GitHub Release asset.

* **Image signing**: Cosign keyless con OIDC de GitHub. Verificación en admission vía Kyverno verifyImages rule.

* **Base images**: distroless o chainguard/static donde sea posible. No :latest jamás.

### **Kubernetes**

* **Kyverno policies** (5 mínimas, con tests): require-resources-limits, require-probes, disallow-privileged, require-signed-images, disallow-latest-tag.

* **NetworkPolicies**: deny-all por namespace, abierto explícitamente solo entre servicios que lo necesitan.

* **PodSecurityStandards** nivel restricted en namespaces de tenants.

### **Identidad y secrets**

* **IRSA** (IAM Roles for Service Accounts) para cualquier servicio que toque AWS. Zero long-lived credentials en el cluster.

* **External Secrets Operator** con SOPS en local y AWS SSM en cloud. Los secrets nunca viven en Git, ni siquiera cifrados.

* **Rotación demostrable**: cambiar valor en SSM → ESO sincroniza → pod lo ve en \<60s sin redeploy.

### **GitHub**

* Branch protection en main: PR review obligatorio, checks verdes, signed commits.

* Secrets de repo escaneados con gitleaks en pre-commit.

* Dependabot para dependencias \+ actions/dependency-review-action en PRs.

# **10\. Estrategia de despliegue**

**Canary con rollback automático** usando Argo Rollouts. Definido por servicio en el Rollout manifest:

* Fase 1: 10% de tráfico al canary, pausa 2 min, AnalysisRun de 60s.

* Fase 2: 50% de tráfico, pausa 2 min, analysis.

* Fase 3: 100%. Revision anterior retenida 6 horas para rollback manual.

**AnalysisTemplate** consulta Prometheus con dos queries:

* success\_rate \= sum(rate(http\_requests\_total{status\!\~"5..",canary="true"}\[2m\])) / sum(rate(http\_requests\_total{canary="true"}\[2m\])) — debe ser \> 0.99.

* latency\_p95\_ratio \= histogram\_quantile(0.95, canary) / histogram\_quantile(0.95, stable) — debe ser \< 1.2.

**Blue/green** disponible como alternativa para orders-api (workload crítico con stateful connection pool). Rollouts soporta ambas estrategias con el mismo CRD.

**Por qué canary y no blue/green por default**: canary consume 10% más de recursos solo durante 2 minutos; blue/green duplica recursos durante toda la ventana. Para servicios stateless, canary tiene mejor ratio costo/seguridad. Este trade-off queda documentado en un ADR.

# **11\. Escenarios de fallo que el sistema debe soportar**

Cada escenario se documenta como un runbook y se ejecuta al menos una vez antes de cerrar el proyecto. Son los 6 escenarios obligatorios:

| Escenario | Mecanismo de resiliencia | Cómo se prueba |
| :---- | :---- | :---- |
| Pod crash | Probes \+ restartPolicy \+ PodDisruptionBudget | kubectl delete pod; verificar sin dropped requests |
| Nodo pierde salud | Karpenter drain \+ respawn | Chaos Mesh: pod-kill \+ node-drain |
| Bad image con 5xx masivos | Rollback automático por SLO burn | Deploy de imagen con endpoint roto; ver rollback en \<5 min |
| DB connection pool agotado | Circuit breaker \+ retries con backoff | Chaos Mesh network delay; ver dashboard caer y recuperar |
| Secret rotado | ESO refresh \+ graceful reload | Cambiar valor en SSM; verificar pod sin restart ve nuevo valor |
| Region-level issue (simulado) | Multi-AZ nodes \+ PDBs | Cordonar 1 AZ entera; verificar que se redistribuye |

# **12\. Métricas técnicas que debés poder mostrar**

**Estas son las métricas que vas a citar literalmente en entrevistas.** Cada una medible en Grafana y capturable con screenshot:

### **Delivery (DORA)**

* Lead time for changes: commit → producción, mediana y p95.

* Deployment frequency: deploys por día por servicio.

* Change failure rate: % de rollouts con rollback automático.

* MTTR: tiempo desde alerta → clear.

### **Reliability**

* SLO attainment por servicio (30d): availability y latency.

* Error budget burn rate: dashboard con ventanas 1h / 6h / 24h.

* Alert noise: alertas disparadas vs. acción requerida.

### **Security / supply chain**

* % de imágenes firmadas que llegaron a producción (objetivo: 100%).

* CVE críticas detectadas por CI en los últimos 30 días.

* Tiempo desde publicación de un CVE → merge del fix (median).

### **Cost**

* Costo por servicio por día (Cost allocation tags \+ dashboard de Karpenter).

* % de nodos en Spot vs. On-demand.

* CPU/Mem request vs. actual usage (waste ratio).

# **13\. Qué demuestra este proyecto en una entrevista**

El interviewer senior que lo abra va a ver evidencia directa de seis competencias que la mayoría de candidatos no puede probar:

* **Mindset de plataforma**: cruce explícito con terraform-modules y repo separado pipeforge-apps demuestra que pensás en contratos y reutilización.

* **GitOps real**: App-of-Apps \+ manifests versionados demuestran que no hacés kubectl apply a mano.

* **SRE / confiabilidad**: SLOs con burn rate y rollback automático por métricas, no por intuición.

* **Supply chain security**: firma y verificación de imágenes, SBOMs, Kyverno en admission. Esto es lo que pide NIST SSDF y lo que Google/Microsoft adoptaron.

* **Progressive delivery**: canary con analysis automática es el estado del arte hoy; pocos lo tienen en portafolio.

* **Observabilidad completa**: métricas \+ logs \+ trazas correlacionados, no solo 'dashboards bonitos'.

**Respuesta modelo para “contame un proyecto”**:

"**Pipeforge es una plataforma de delivery para una empresa e-commerce simulada**. El problema original era que cada deploy era una ventana de mantenimiento y el onboarding de un servicio tomaba 3 días. Diseñé una plataforma sobre Kubernetes con GitOps vía ArgoCD, progressive delivery con Argo Rollouts y rollback automático basado en SLO burn rate. Los tres microservicios de ejemplo tienen SLOs explícitos con multi-window multi-burn-rate alerts. La pipeline firma imágenes con Cosign keyless y Kyverno bloquea en admission cualquier imagen sin firma. El costo total fue menor a $50 USD porque hice todo en kind local y solo promoví a EKS para la demo final. El trade-off principal fue elegir canary sobre blue/green por default: canary consume 10% más de recursos durante 2 minutos, blue/green duplica recursos durante toda la ventana; para workloads stateless es una mejor relación. Si arrancara de nuevo, escribiría los AnalysisTemplates con TDD desde el principio porque iterar sobre ellos con prod real es lento."

# **14\. Cómo documentarlo en GitHub**

### **Estructura de repos (portafolio visible como 3 entidades cruzadas)**

* github.com/\<user\>/pipeforge — la plataforma y los 3 servicios.

* github.com/\<user\>/pipeforge-apps — repo GitOps con Applications y Rollouts.

* github.com/\<user\>/terraform-modules — módulos consumidos por pipeforge.

### **README del repo principal (orden obligado)**

* Badge row (CI status, license, image signed, last release).

* One-liner de propósito \+ lead story de 3 líneas.

* Mermaid diagram de la arquitectura.

* Tabla de componentes \+ por qué se eligió cada uno.

* Quickstart: 5 comandos máximo para levantar la plataforma en kind.

* Demo GIF de 30–60 segundos mostrando canary \+ rollback automático.

* SLOs publicados en formato tabla.

* Links a ADRs, runbooks, post-mortem.

* Sección Trade-offs con 4–5 decisiones explicadas.

* Sección Lessons learned con 3 ítems concretos (no platitudes).

### **Carpeta docs/**

* docs/adr/ — mínimo 6 ADRs Nygard: ArgoCD vs Flux, Rollouts vs Flagger, canary vs blue/green, Kyverno vs Gatekeeper, SOPS vs sealed-secrets, Karpenter vs Cluster Autoscaler.

* docs/runbooks/ — mínimo 6 runbooks, uno por escenario de fallo de la sección 11\.

* docs/postmortems/ — al menos uno realista con timeline, 5-whys, action items.

* docs/slos.md — definiciones de SLO con justificación del target.

* docs/cost.md — análisis de costo con FinOps recomendations.

### **Release story**

* Conventional commits (feat:, fix:, docs:, chore:).

* Releases semánticas con CHANGELOG automatizado (release-please action).

* Tag final v1.0.0 cuando el proyecto está cerrado.

# **15\. Roadmap (4–8 semanas, \~8 hs/semana)**

El camino estándar es 8 semanas. Si tenés más tiempo podés comprimir a 4-5 semanas. Si tenés menos, sacrificá primero la parte de AWS (Semana 7\) antes que cualquier otra.

### **Semana 1 — Fundación**

* pipeforge y pipeforge-apps creados, LICENSE, .gitignore, README inicial.

* 3 microservicios scaffold (Python, Go, Node) con endpoints mínimos, tests, Dockerfile.

* kind cluster up con un script.

* CI básico: test \+ build image.

### **Semana 2 — GitOps y primer deploy**

* ArgoCD instalado vía manifest en kind.

* pipeforge-apps con App-of-Apps; los 3 servicios desplegados en el cluster.

* Ingress con nginx-ingress \+ DNS local via /etc/hosts.

* NATS para comunicación async entre orders y notifications.

### **Semana 3 — Observabilidad**

* kube-prometheus-stack \+ Loki \+ Tempo instalados como Applications.

* OpenTelemetry SDK en los 3 servicios; trazas punta a punta funcionando.

* 1 dashboard RED por servicio.

* SLOs definidos en docs/slos.md con justificación.

### **Semana 4 — Progressive delivery**

* Argo Rollouts instalado; 3 servicios migrados de Deployment a Rollout.

* AnalysisTemplates con Prometheus queries; demo de canary exitoso.

* Demo: push imagen rota intencionalmente; rollback automático visible en UI.

* media/demo-rollback.gif grabado.

### **Semana 5 — Seguridad y supply chain**

* Trivy en CI bloqueando CVE crítica.

* Cosign keyless; Kyverno verifyImages policy.

* External Secrets Operator con SOPS; un secret inyectado en orders-api.

* NetworkPolicies deny-all \+ allow explícito; PodSecurityStandards restricted.

### **Semana 6 — Resiliencia y alertas**

* Alertmanager a Discord; alertas de SLO burn rate funcionando.

* PodDisruptionBudgets por servicio.

* Los 6 escenarios de fallo ejecutados y documentados en runbooks.

* docs/postmortems/ con un post-mortem sintético realista.

### **Semana 7 — Promoción a AWS (opcional)**

* terraform-modules con módulos VPC, EKS, Karpenter, IAM baseline, ECR.

* infra/envs/aws-dev/ consume los módulos.

* Plataforma redeployada a EKS; ArgoCD sync verde; demo funcional.

* **Destruir después de grabar la demo.** Costo total AWS estimado: $10–30.

### **Semana 8 — Pulido y cierre**

* ADRs (6 mínimo) escritos.

* Dashboard DORA metrics funcional.

* FinOps section en docs/cost.md.

* README cerrado: Trade-offs \+ Lessons learned.

* git tag v1.0.0 \+ GitHub Release con CHANGELOG.

* Publicar un post técnico (Medium / dev.to) sobre canary con Argo Rollouts.

| Regla de cierre por semana Una semana se cierra cuando sus entregables están en GitHub con commits visibles. Una semana no cerrada bloquea la siguiente. Si no llegás, comprimí semanas 7 y 8 en una sola (Semana 7 local, sin AWS) antes que dejar todo a medias. |
| :---- |

# **16\. Estimación de costo mensual**

### **Escenario realista (recomendado)**

Semanas 1–6 completas en local con kind: $0. Semana 7 con AWS, trabajo activo \~20 hs y teardown disciplinado: $10–30 total. Semana 8 sin AWS: $0.

**Total del proyecto completo: $10–30 USD.** Todos los skills demostrables; el portafolio queda idéntico.

### **Escenario AWS siempre encendido (trampa cara)**

| Item | Detalle | USD / mes |
| :---- | :---- | :---- |
| EKS control plane | $0.10/h × 730 | 73 |
| 2 × t3.medium on-demand | Nodos mínimos para la plataforma | 60 |
| NAT Gateway (1 AZ) | Asesino silencioso | 35 |
| ALB Ingress | \+ LCUs bajo tráfico bajo | 20 |
| EBS volumes (Prom, Loki, Tempo) | \~60 GB gp3 | 15 |
| CloudWatch logs, ECR, S3+DDB, Route 53 | Misceláneos | 15 |
| Total | Sin Karpenter spot | \~220 |
| Total con Karpenter \+ Spot 70% | Optimizado | \~100–130 |

### **Cómo asegurarte de NO pagar de más**

* aws-nuke o script terraform destroy atado a un cron local después de cada sesión.

* Budget alarm en AWS en $20 (aws budgets create-budget). Email inmediato al exceder.

* Tag obligatorio Project=pipeforge en todo; permite deletar a ciegas con filtro.

* Revisar aws ec2 describe-volumes \--filters Name=status,Values=available semanalmente — los PVCs huérfanos son caros.

* Región us-east-1 (la más barata); evitar us-west-2 y ap-\* salvo que el role lo requiera.

# **Cómo empezar hoy**

Tres pasos para cerrar la Semana 1 antes del próximo domingo:

1. Crear pipeforge y pipeforge-apps en GitHub. README inicial con el one-liner y el Mermaid del diagrama.

2. Scaffoldear los 3 servicios mínimos (una ruta /healthz y una /api/v1/ping alcanzan para empezar) con Dockerfile y CI que buildee y corra tests.

3. Bash script bootstrap/up.sh que cree el kind cluster con 3 nodos y kubectl get nodes devuelva 3 Ready.

**Al final de la Semana 1 el commit visible en GitHub demuestra**: repo profesional, 3 servicios reales, cluster reproducible. Eso ya es más de lo que tiene el 70% de los candidatos.

El checkpoint semanal devops-platform-weekly-checkpoint (domingos 19:00) va a preguntar por los items cerrados de la semana. Si cerrás los 4 hitos de la Semana 1, el checkpoint va a marcar VERDE automáticamente.