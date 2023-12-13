# Init Create Graph

## Commands

### Testing

#### DBpedia

##### Collect IRIs from a SPARQL endpoint

    ./dist/cli.js sparql-iterate \
      --endpoint-url "https://dbpedia.org/sparql" \
      --query-file ./fixtures/iterate.rq \
      --number-of-iris-per-request 2 \
      --wait-between-requests 100 \
      --resource-dir ./tmp/dbpedia \
      --queue-file ./tmp/queue.sqlite
