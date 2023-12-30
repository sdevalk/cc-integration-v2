import {SparqlChangeChecker} from './checker.js';
import {describe, expect, it} from 'vitest';

const query = `
  PREFIX dbo:	<http://dbpedia.org/ontology/>
  PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>

  ASK {
    BIND(xsd:integer("?_compareValue") AS ?compareValue)
    ?_iri dbo:wikiPageRevisionID ?revisionId
    FILTER(IF(?compareValue != 0, ?revisionId > ?compareValue, true))
  }
`;

describe('run', () => {
  it.skip('throws if the endpoint is invalid', async () => {
    expect.assertions(5); // Including retries

    const checker = new SparqlChangeChecker({
      endpointUrl: 'http://localhost',
    });

    checker.on('warning', (err: Error) => {
      expect(err.message).toBe(
        'Failed to fetch results from SPARQL endpoint: fetch failed'
      );
    });

    try {
      await checker.run({
        query,
        iri: 'http://localhost',
        compareValue: '1234',
      });
    } catch (err) {
      const error = err as Error;
      expect(error.message).toEqual('fetch failed');
    }
  });

  it('returns false if a resource has not changed since the last check', async () => {
    const checker = new SparqlChangeChecker({
      endpointUrl: 'https://dbpedia.org/sparql',
    });

    const isChanged = await checker.run({
      query,
      iri: 'http://dbpedia.org/resource/Netherlands',
      compareValue: 1124717624 + 10000, // Revision ID. Can change if the source data changes
    });

    expect(isChanged).toBe(false);
  });

  it('returns true if there is no compare value from the last check', async () => {
    const checker = new SparqlChangeChecker({
      endpointUrl: 'https://dbpedia.org/sparql',
    });

    const isChanged = await checker.run({
      query,
      iri: 'http://dbpedia.org/resource/Netherlands',
    });

    expect(isChanged).toBe(true);
  });

  it('returns true if a resource has changed since the last check', async () => {
    const checker = new SparqlChangeChecker({
      endpointUrl: 'https://dbpedia.org/sparql',
    });

    const isChanged = await checker.run({
      query,
      iri: 'http://dbpedia.org/resource/Netherlands',
      compareValue: 1124717623, // Revision ID
    });

    expect(isChanged).toBe(true);
  });
});
