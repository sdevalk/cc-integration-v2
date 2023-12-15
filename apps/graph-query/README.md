# Graph query

Create or update a graph by querying a SPARQL endpoint

## Commands

### Testing

#### AAT

##### Create or update a graph by querying a SPARQL endpoint

    cp ./fixtures/aat-queue.sqlite ./tmp/aat-queue.sqlite

    ./dist/cli.js query \
      --resource-dir ./tmp/aat \
      --queue-file ./tmp/aat-queue.sqlite \
      --endpoint-url "https://vocab.getty.edu/sparql" \
      --query-file ./fixtures/generate.rq \
      --number-of-concurrent-requests 3 \
      --wait-between-requests 100 \
      --timeout-per-request 10000 \
      --batch-size 1

##### Upload graph files to data platform

    cp ./fixtures/empty-queue.sqlite ./tmp/empty-queue.sqlite

    ./dist/cli.js upload \
      --resource-dir ./tmp/aat \
      --queue-file ./fixtures/empty-queue.sqlite \
      --triplydb-instance-url "$TRIPLYDB_INSTANCE_URL" \
      --triplydb-api-token "$TRIPLYDB_API_TOKEN" \
      --triplydb-account "$TRIPLYDB_ACCOUNT_TESTING" \
      --triplydb-dataset "$TRIPLYDB_DATASET_KG_TESTING" \
      --triplydb-service-name kg \
      --triplydb-service-type virtuoso \
      --graph-name "https://example.org/aat" \
      --dir-temp ./tmp
