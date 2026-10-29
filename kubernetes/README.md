# Jaffel Shop Kubernetes manifests

These manifests target the Docker Desktop Kubernetes cluster and the public
Docker Hub images published as `v1.0.0`.

## Before applying

1. Ensure Docker Desktop Kubernetes is enabled and `kubectl` uses the
   `docker-desktop` context.
2. Check that an NGINX Ingress Controller and the `nginx` IngressClass are
   installed. The Ingress sends `/` and frontend routes to the webapp, rewrites
   `/api/catalog/*` to the catalog API, and rewrites `/api/*` to the orders API.
3. Copy `secrets.yaml.example` to `secrets.yaml`. Replace both password
   placeholders, using the same URL-safe password in `POSTGRES_PASSWORD` and
   `DATABASE_URL`, and replace `INTERNAL_SECRET` with a long random value.
   `secrets.yaml` is git-ignored; do not commit it.
4. The database PVC requests `1Gi` and uses the cluster's default StorageClass
   because `storageClassName` is omitted. `10Mi` is too small for a PostgreSQL
   data directory.

## Apply

From this directory:

```sh
kubectl apply -f namespace.yaml
kubectl apply -f secrets.yaml
kubectl apply -k .
kubectl -n jaffelshop get pods,pvc,services,ingress
```

The PVC keeps database files through pod and workload restarts as long as the
PVC and Docker Desktop's Kubernetes storage are retained. Deleting the PVC or
resetting Docker Desktop's Kubernetes storage can delete the data.

For local access, check the Ingress address with `kubectl -n jaffelshop get
ingress`. The URL depends on the NGINX controller setup. Do not apply until
`kubectl get ingressclass` shows the `nginx` class.
