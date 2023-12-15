# Graph dereference

Create or update a graph by dereferencing IRIs

## Commands

### Testing

#### DBpedia

##### Create or update a graph by dereferencing IRIs

    cp ./fixtures/filled-queue.sqlite ./tmp/filled-queue.sqlite

    ./dist/cli.js dereference \
      --resource-dir ./tmp/dbpedia \
      --queue-file ./tmp/filled-queue.sqlite \
      --number-of-concurrent-requests 3 \
      --wait-between-requests 100 \
      --batch-size 1

##### Upload graph files to data platform

    cp ./fixtures/empty-queue.sqlite ./tmp/empty-queue.sqlite

    ./dist/cli.js upload \
      --resource-dir "./tmp/dbpedia" \
      --queue-file ./fixtures/empty-queue.sqlite \
      --triplydb-instance-url "$TRIPLYDB_INSTANCE_URL" \
      --triplydb-api-token "$TRIPLYDB_API_TOKEN" \
      --triplydb-account "$TRIPLYDB_ACCOUNT_TESTING" \
      --triplydb-dataset "$TRIPLYDB_DATASET_KG_TESTING" \
      --triplydb-service-name "kg" \
      --triplydb-service-type "virtuoso" \
      --graph-name "https://example.org/dbpedia" \
      --dir-temp "./tmp"
