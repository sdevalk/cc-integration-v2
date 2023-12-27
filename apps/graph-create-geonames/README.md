# Graph create GeoNames

Creates or updates a graph by dereferencing GeoNames IRIs

## Testing

### GeoNames

    ./dist/cli.js create \
      --resource-dir ./tmp/geonames/resources \
      --data-dir ./tmp/geonames/data \
      --endpoint-url "https://api.colonialcollections.nl/datasets/data-hub-testing/knowledge-graph/services/kg/sparql" \
      --locations-iterate-query-file ./fixtures/iterate-locations.rq \
      --countries-iterate-query-file ./fixtures/iterate-countries.rq \
      --iterate-wait-between-requests 100 \
      --iterate-timeout-per-request 300000 \
      --iterate-number-of-iris-per-request 2 \
      --dereference-wait-between-requests 100 \
      --dereference-timeout-per-request 300000 \
      --dereference-number-of-concurrent-requests 1 \
      --dereference-batch-size 1 \
      --triplydb-instance-url "$TRIPLYDB_INSTANCE_URL" \
      --triplydb-api-token "$TRIPLYDB_API_TOKEN" \
      --triplydb-account "$TRIPLYDB_ACCOUNT_DEVELOPMENT" \
      --triplydb-dataset "$TRIPLYDB_DATASET_KG_DEVELOPMENT" \
      --triplydb-service-name kg \
      --triplydb-service-type virtuoso \
      --graph-name "https://example.org/geonames" \
      --temp-dir ./tmp
