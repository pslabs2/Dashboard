# Homelab Dashboard

A self-hosted dashboard for a Kubernetes homelab:

- **Home**: application launcher with live up/down status, from a YAML config and/or annotated Ingresses.
- **Cluster**: nodes, capacity, CPU/memory usage history (metrics-server) and warning events.
- **Workloads**: pods across namespaces with kubectl-style status.
- **GitOps**: Argo CD Applications, sync and health, read directly from the Kubernetes API (no Argo CD token).

It runs in-cluster with a read-only ServiceAccount.

## Install (Helm)

```sh
helm install dashboard oci://ghcr.io/pslabs2/charts/homelab-dashboard \
  --namespace dashboard --create-namespace -f my-values.yaml
```

Or point an Argo CD Application at `deploy/helm/homelab-dashboard`. See [`values.yaml`](deploy/helm/homelab-dashboard/values.yaml) for all options. Exposure is via `ingress.*` (Ingress) or `httpRoute.*` (Gateway API `HTTPRoute`); both are disabled by default.

Images: `ghcr.io/pslabs2/dashboard` (`linux/amd64`, `linux/arm64`), tagged `main`, `sha-<commit>` and `X.Y.Z` on release tags.

## Configuration

### Dashboard config

Set the chart's `config` value (rendered to a ConfigMap), or use `existingConfigMap`. See [`config/dashboard.example.yaml`](config/dashboard.example.yaml). The file is hot-reloaded when it changes.

Ingress discovery (`discovery.ingress.enabled: true`) adds Ingresses annotated `dashboard.homelab/enabled: "true"`. Optional annotations: `dashboard.homelab/name`, `group`, `description`, `icon`, `url`, `health-url`, `health-check` (`"false"` disables probes).

Icons are [Lucide](https://lucide.dev/icons) names (`film`) or `https://` image URLs.

### Environment variables

| Variable                     | Default                 | Description                            |
| ---------------------------- | ----------------------- | -------------------------------------- |
| `DASHBOARD_CONFIG_PATH`      | `config/dashboard.yaml` | Path to the YAML config                |
| `AUTH_MODE`                  | `none`                  | `none` or `proxy` (see Security model) |
| `AUTH_PROXY_USER_HEADER`     | `x-auth-request-user`   | Identity header from the auth proxy    |
| `AUTH_PROXY_EMAIL_HEADER`    | `x-auth-request-email`  | Email header from the auth proxy       |
| `K8S_REQUEST_TIMEOUT_MS`     | `8000`                  | Kubernetes API request timeout         |
| `K8S_CACHE_TTL_MS`           | `4000`                  | Server-side cache for Kubernetes reads |
| `METRICS_SAMPLE_INTERVAL_MS` | `15000`                 | Usage history sampling interval        |
| `METRICS_HISTORY_POINTS`     | `240`                   | Samples kept in memory                 |
| `HEALTHCHECK_TIMEOUT_MS`     | `5000`                  | App status probe timeout               |

Set extra variables with the chart's `env` value.

## Security model

- **Read-only RBAC.** The ClusterRole grants only `get`/`list` on nodes, pods, namespaces, events, deployments, statefulsets, daemonsets, ingresses, `metrics.k8s.io` and Argo CD `applications`. No Secrets or ConfigMaps.
- **Authentication** is delegated to a forward-auth proxy (oauth2-proxy, Authelia, Authentik, ...). With `AUTH_MODE=proxy`, every request except `/api/healthz` and `/api/readyz` must carry the identity header. Only enable this when the Service is reachable exclusively through the proxy, otherwise headers can be spoofed. With `AUTH_MODE=none`, anyone who can reach the dashboard can see cluster state.
- **Health probes** only request operator-configured URLs; nothing from the browser is fetched server-side (no SSRF). Any response below 500 counts as up.
- **CSP.** Every page gets a per-request nonce and a strict Content Security Policy (set in `src/proxy.ts`). Because of this, pages are rendered per request and Partial Prerendering / `cacheComponents` is disabled.
- **Container** runs as uid 1000 with a read-only root filesystem, no capabilities and `RuntimeDefault` seccomp.

## Development

Requires Node 26 and a kubeconfig (`$KUBECONFIG` or `~/.kube/config`).

```sh
npm ci
cp config/dashboard.example.yaml config/dashboard.yaml
npm run dev
```

`npm run check` runs lint, typecheck and tests. `docker build -t dashboard .` builds the image.
