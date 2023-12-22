# GeoNames

Initialize the creating or updating of a graph

## Commands

### Testing

#### DBpedia

##### Collect and queue IRIs from a SPARQL endpoint

    ./dist/cli.js run \
      --resource-dir ./tmp/dbpedia \
      --queue-file ./tmp/queue.sqlite \
      --endpoint-url "https://dbpedia.org/sparql" \
      --iterate-query-file ./fixtures/iterate.rq \
      --generate-query-file ./fixtures/generate.rq \
      --wait-between-requests 100 \
      --number-of-iris-per-request 2 \
      --number-of-concurrent-requests 1 \
      --timeout-per-request 300000 \
      --batch-size 1
