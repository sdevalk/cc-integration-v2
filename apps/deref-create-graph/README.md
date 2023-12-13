# Deref Create Graph

## Commands

### Testing

#### DBpedia

##### Create a graph by dereferencing IRIs

    ./dist/cli.js run \
      --wait-between-requests 100 \
      --resource-dir ./tmp/dbpedia \
      --queue-file ./tmp/queue.sqlite \
      --batch-size 10
