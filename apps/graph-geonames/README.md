# GeoNames

Initialize the creating or updating of a graph

## Commands

### Testing

#### DBpedia

##### Collect and queue IRIs from a SPARQL endpoint

    ./dist/cli.js run \
      --endpoint-url "https://dbpedia.org/sparql" \
      --query-file ./fixtures/iterate-1.rq \
      --number-of-iris-per-request 2 \
      --wait-between-requests 100 \
      --resource-dir ./tmp/dbpedia \
      --queue-file ./tmp/queue.sqlite
