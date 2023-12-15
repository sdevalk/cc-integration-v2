# Graph dereference

Create or update a graph by dereferencing IRIs

## Commands

### Testing

#### DBpedia

##### Create or update a graph by dereferencing IRIs

    cp ./fixtures/filled-queue.sqlite ./tmp/filled-queue.sqlite

    ./dist/cli.js run \
      --number-of-concurrent-requests 3 \
      --wait-between-requests 100 \
      --resource-dir ./tmp/dbpedia \
      --queue-file ./tmp/filled-queue.sqlite \
      --batch-size 1
