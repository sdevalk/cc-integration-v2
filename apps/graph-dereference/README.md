# Graph dereference

Create or update a graph by dereferencing IRIs

## Commands

### Testing

#### DBpedia

##### Create or update a graph by dereferencing IRIs

    cp ./fixtures/aat-queue.sqlite ./tmp/aat-queue.sqlite

    ./dist/cli.js run \
      --resource-dir ./tmp/aat \
      --queue-file ./tmp/aat-queue.sqlite \
      --headers.accept "text/turtle" \
      --number-of-concurrent-requests 3 \
      --wait-between-requests 100 \
      --batch-size 1 \
      --triplydb-instance-url "$TRIPLYDB_INSTANCE_URL" \
      --triplydb-api-token "$TRIPLYDB_API_TOKEN" \
      --triplydb-account "$TRIPLYDB_ACCOUNT_DEVELOPMENT" \
      --triplydb-dataset "$TRIPLYDB_DATASET_KG_DEVELOPMENT" \
      --triplydb-service-name kg \
      --triplydb-service-type virtuoso \
      --graph-name "https://example.org/aat" \
      --dir-temp ./tmp
