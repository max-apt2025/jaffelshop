# Jaffel Shop: Kubernetes Project Plan

## Goal

Deploy Jaffel Shop to Kubernetes and prepare a classroom demonstration that
shows how the application meets all nine project requirements. Work through the
steps in order. Before implementing each step, review its scope and acceptance
checks together; do not proceed to the next step until that step is reviewed.

## Current application

- `webapp/`: React/Vite storefront, served as a static site.
- `catalog-api/`: Node.js/Express REST API; owns products and stock.
- `orders-api/`: Python/FastAPI REST API; owns orders and asks `catalog-api` to
  reserve stock.
- PostgreSQL: separate database container in the current Docker Compose setup;
  both APIs currently use the same database, with separate tables.

## Recommended Kubernetes layout

- Run each application image as its own Kubernetes `Deployment` and expose
  each with a `ClusterIP` `Service`.
- Run PostgreSQL as a single-replica `StatefulSet` with a `PersistentVolumeClaim`
  (PVC), plus an internal `ClusterIP` `Service`. Do not scale the database.
- Use a `ConfigMap` for non-secret configuration and a Kubernetes `Secret` for
  database credentials and the internal service secret.
- Publish the three application images to Docker Hub with versioned tags. Use
  those tags in Kubernetes manifests; avoid relying on a mutable `latest` tag
  for the classroom deployment.
- Expose the webapp and browser-facing API routes through one external entry
  point, preferably an Ingress. Route API traffic to the internal services so
  browser requests do not depend on Docker Compose hostnames or localhost URLs.
- Keep the two APIs independently scalable by assigning them separate
  Deployments and Services. Demonstrate scaling them separately with replica
  changes. Add autoscaling only if the chosen cluster supports and needs it.

## Decisions to make before cluster-specific work

These depend on the target environment and should be reviewed when we reach
the relevant step:

- Kubernetes environment and context (for example, Minikube, kind, Docker
  Desktop, or a remote cluster).
- Docker Hub username/organization and repository names. Do not put registry
  passwords or access tokens in this plan or in Git.
- Public hostname or local ingress/LoadBalancer access method, and whether an
  Ingress controller is already installed.
- Storage class available in the cluster. The PVC must use storage that
  survives pod restarts and rescheduling supported by that environment.
- Whether the classroom demo should start with an empty database or preserve
  the current local Compose data. The Compose volume does not automatically
  transfer into Kubernetes.

## Step-by-step work and review gates

### Step 1 — Inspect and prepare the application for Kubernetes

Review container ports, startup behavior, health endpoints, environment
variables, and browser API URLs. Make the webapp call APIs through URLs that
will work from a browser outside the cluster. The current Vite defaults point
to `localhost:8080` and `localhost:8000`, so they must be replaced or supplied
at build time for Kubernetes. A recommended approach is same-origin routes
such as `/api/catalog` and `/api/orders`, routed by Ingress to the API Services.

Add or adjust readiness/liveness probes and make configuration injectable
through environment variables. Confirm the catalog seed behavior is safe when
the database already contains products; startup should add new seed products
without resetting stock or duplicating existing products.

**Review before implementation:** decide the browser-to-API URL approach and
which health/startup improvements are in scope.

**Acceptance checks:** all three app containers start with configuration
provided externally; API health endpoints can be used by Kubernetes probes;
webapp API requests do not use cluster-only DNS names in the browser.

### Step 2 — Build and publish application images

Build images for `webapp`, `catalog-api`, and `orders-api` from their respective
Dockerfiles. Tag each with the selected Docker Hub namespace and a version
identifier, then push each image. Record the exact tags for the manifests and
demo notes. If repositories are private, create an image-pull Secret in the
Kubernetes namespace without committing credentials.

**Review before implementation:** confirm the Docker Hub namespace, repository
names, tag convention, and whether repositories are public or private.

**Acceptance checks:** Docker Hub contains all three referenced tags; the
images can be pulled from outside the local machine or the namespace has a
working image-pull Secret.

### Step 3 — Prepare Kubernetes configuration and database storage

Create a dedicated namespace and configuration resources. Store database
credentials and the shared internal API secret in a Secret. Create the
PostgreSQL Service, one-replica StatefulSet, and PVC using the selected storage
class. Configure a database readiness check and keep the database internal to
the cluster.

**Review before implementation:** confirm namespace, storage class, initial
database credentials, and whether Kubernetes should initialize a fresh
database.

**Acceptance checks:** PostgreSQL becomes Ready; its PVC is Bound; data remains
after deleting and recreating the PostgreSQL pod; the database is not exposed
publicly.

### Step 4 — Deploy the catalog API

Create a catalog API Deployment and internal Service using the published image.
Configure its database connection, allowed web origin if still needed, shared
secret, resource requests/limits, and readiness/liveness probes. Wait for the
database to be ready before checking the API.

**Review before implementation:** confirm replica count, resource settings,
and whether `catalog-api` should be reachable only inside the cluster.

**Acceptance checks:** the Deployment is Available; `/health` responds through
the in-cluster Service; `/products` returns the seeded catalog; pod logs show
successful database startup.

### Step 5 — Deploy the orders API

Create a separate orders API Deployment and internal Service. Configure its
database connection, internal catalog URL using Kubernetes Service DNS, the
same shared secret, browser origin if needed, resource requests/limits, and
probes.

**Review before implementation:** confirm replica count and resource settings.

**Acceptance checks:** the Deployment is Available; `/health` and `/orders`
work through the in-cluster Service; an order request reaches `catalog-api`,
reserves stock, and stores the order.

### Step 6 — Deploy the webapp and external access

Create the webapp Deployment and internal Service, then configure the selected
Ingress or other external entry point. Route `/` to the webapp and browser API
paths to their respective API Services. Configure host/TLS if the environment
supports it.

**Review before implementation:** confirm external access method, hostname,
path routing, and TLS expectations for the demo.

**Acceptance checks:** the storefront opens in a browser outside the cluster;
products load and orders can be submitted without browser CORS or localhost
errors.

### Step 7 — Demonstrate independent scaling and persistence

Scale `catalog-api` and `orders-api` independently and show their separate
Deployment replica counts. Verify requests still work with multiple replicas.
Restart or recreate the PostgreSQL pod and confirm products and orders remain.
Leave PostgreSQL at one replica.

**Review before implementation:** agree on the replica counts and which
restart/scaling demonstrations are appropriate for the chosen cluster.

**Acceptance checks:** each API can be scaled without changing the other API's
replica count; PostgreSQL remains single-replica; database records survive the
supported infrastructure restart demonstration.

### Step 8 — Prepare the classroom runbook and evidence

Document the exact image tags, namespace, deployment commands, external URL,
health checks, scaling commands, persistence demonstration, and cleanup
commands. Capture evidence for each project requirement, such as `kubectl get`
output, PVC status, API responses, and the browser flow.

**Review before implementation:** review the demo sequence, cleanup behavior,
and which screenshots or terminal outputs to include in the submission.

**Acceptance checks:** another student can follow the runbook from a clean
cluster context and reproduce the deployment and core demo.

## Requirement mapping

| Project requirement | Planned evidence |
|---|---|
| 1. Deployable on Kubernetes | Versioned Kubernetes manifests and runbook |
| 2. Two microservice types and a database | Node.js catalog API, Python orders API, PostgreSQL |
| 3. REST APIs | Catalog and orders endpoint responses |
| 4. Accessible outside Kubernetes | Browser access through Ingress or selected external entry point |
| 5. Independently horizontally scalable microservices | Separate API Deployments scaled independently |
| 6. Images published to Docker Hub | Public image tags or configured image-pull Secret |
| 7. Separate database service | PostgreSQL StatefulSet and internal Service |
| 8. Persistent database storage | Bound PVC and data-retention restart demonstration |
| 9. Database need not scale | PostgreSQL StatefulSet remains at one replica |

## Working agreement

This document is the plan only. For each step, first review the proposed
changes and acceptance checks together. Implement that step only after the
review, then verify it before moving to the next step.
