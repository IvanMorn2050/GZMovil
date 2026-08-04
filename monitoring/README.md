# Monitoreo (Prometheus + Grafana)

Prometheus y Grafana corren localmente con Docker y "raspan" (scrape) el
endpoint público `https://gzmovil.onrender.com/metrics` del backend en
Render. No requiere ningún servicio de nube adicional ni credenciales.

## Cómo correrlo

```
cd monitoring
docker compose up
```

- Prometheus: http://localhost:9090
- Grafana: http://localhost:3000 (usuario `admin`, contraseña `admin` — Grafana
  pedirá cambiarla al primer login, se puede omitir con "Skip")

El dashboard **"Guardian Zero - Backend"** ya viene cargado solo (datasource
y dashboard se provisionan automáticamente al levantar los contenedores).

## Antes de la demo/presentación

El backend está en el plan gratuito de Render, que "duerme" tras ~15 min sin
tráfico y tarda unos segundos en despertar. Antes de mostrar el dashboard:

1. Abre `https://gzmovil.onrender.com/api/auth/ping` en el navegador para
   despertarlo (o simplemente abre la app un momento antes).
2. Espera 1-2 ciclos de scrape (30-60s) para que Prometheus tenga datos
   frescos.

Si algún panel no muestra datos, revisa Prometheus directamente en
http://localhost:9090/graph — ahí puedes escribir cualquier métrica y ver
si existe, o revisar Status → Targets para confirmar que el scrape a
`gzmovil.onrender.com` está en estado "UP".
