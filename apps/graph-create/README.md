# Graph create

Creates or updates a graph by querying a SPARQL endpoint

## Testing

### DBpedia

    ./dist/cli.js create \
      --resource-dir ./tmp/dbpedia \
      --queue-file ./tmp/data.sqlite \
      --endpoint-url "https://dbpedia.org/sparql" \
      --iterate-query-file ./fixtures/queries/iterate-dbpedia.rq \
      --iterate-wait-between-requests 100 \
      --iterate-timeout-per-request 300000 \
      --iterate-number-of-iris-per-request 2 \
      --generate-query-file ./fixtures/queries/generate-dbpedia.rq \
      --generate-wait-between-requests 100 \
      --generate-timeout-per-request 300000 \
      --generate-number-of-concurrent-requests 1 \
      --generate-batch-size 1 \
      --triplydb-instance-url "$TRIPLYDB_INSTANCE_URL" \
      --triplydb-api-token "$TRIPLYDB_API_TOKEN" \
      --triplydb-account "$TRIPLYDB_ACCOUNT_DEVELOPMENT" \
      --triplydb-dataset "$TRIPLYDB_DATASET_KG_DEVELOPMENT" \
      --triplydb-service-name kg \
      --triplydb-service-type virtuoso \
      --graph-name "https://example.org/dbpedia" \
      --temp-dir ./tmp
