# GeoNames

Initialize the creating or updating of a graph

## Commands

### Testing

#### DBpedia

##### Collect and queue IRIs from a SPARQL endpoint

    ./dist/cli.js create \
      --resource-dir ./tmp/dbpedia \
      --queue-file ./tmp/queue.sqlite \
      --endpoint-url "https://dbpedia.org/sparql" \
      --iterate-query-file ./fixtures/iterate.rq \
      --iterate-wait-between-requests 100 \
      --iterate-timeout-per-request 300000 \
      --iterate-number-of-iris-per-request 2 \
      --generate-query-file ./fixtures/generate.rq \
      --generate-wait-between-requests 100 \
      --generate-timeout-per-request 300000 \
      --generate-number-of-concurrent-requests 1 \
      --generate-batch-size 1
