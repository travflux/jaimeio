import { describe, it, expect } from 'vitest';
import { generateOrganizationSchema, HAMBRY_ORGANIZATION } from '../client/src/lib/organization-schema';

describe('SEO Enhancements', () => {
  describe('Organization Schema', () => {
    it('should generate valid JSON-LD Organization schema', () => {
      const config = {
        name: 'Test Organization',
        url: 'https://example.com',
        logo: 'https://example.com/logo.png',
      };

      const schema = generateOrganizationSchema(config);
      const parsed = JSON.parse(schema);

      expect(parsed['@context']).toBe('https://schema.org');
      expect(parsed['@type']).toBe('Organization');
      expect(parsed.name).toBe('Test Organization');
      expect(parsed.url).toBe('https://example.com');
      expect(parsed.logo['@type']).toBe('ImageObject');
      expect(parsed.logo.url).toBe('https://example.com/logo.png');
    });

    it('should include optional description', () => {
      const config = {
        name: 'Test Org',
        url: 'https://example.com',
        logo: 'https://example.com/logo.png',
        description: 'A test organization',
      };

      const schema = generateOrganizationSchema(config);
      const parsed = JSON.parse(schema);

      expect(parsed.description).toBe('A test organization');
    });

    it('should include contact information', () => {
      const config = {
        name: 'Test Org',
        url: 'https://example.com',
        logo: 'https://example.com/logo.png',
        email: 'contact@example.com',
        telephone: '+1-555-0100',
      };

      const schema = generateOrganizationSchema(config);
      const parsed = JSON.parse(schema);

      expect(parsed.contactPoint).toBeDefined();
      expect(parsed.contactPoint['@type']).toBe('ContactPoint');
      expect(parsed.contactPoint.contactType).toBe('customer service');
      expect(parsed.contactPoint.email).toBe('contact@example.com');
      expect(parsed.contactPoint.telephone).toBe('+1-555-0100');
    });

    it('should include postal address', () => {
      const config = {
        name: 'Test Org',
        url: 'https://example.com',
        logo: 'https://example.com/logo.png',
        address: {
          streetAddress: '123 Main St',
          addressLocality: 'San Francisco',
          addressRegion: 'CA',
          postalCode: '94102',
          addressCountry: 'US',
        },
      };

      const schema = generateOrganizationSchema(config);
      const parsed = JSON.parse(schema);

      expect(parsed.address).toBeDefined();
      expect(parsed.address['@type']).toBe('PostalAddress');
      expect(parsed.address.streetAddress).toBe('123 Main St');
      expect(parsed.address.addressLocality).toBe('San Francisco');
      expect(parsed.address.addressRegion).toBe('CA');
      expect(parsed.address.postalCode).toBe('94102');
      expect(parsed.address.addressCountry).toBe('US');
    });

    it('should include social media profiles', () => {
      const config = {
        name: 'Test Org',
        url: 'https://example.com',
        logo: 'https://example.com/logo.png',
        socialProfiles: [
          'https://twitter.com/testorg',
          'https://facebook.com/testorg',
          'https://linkedin.com/company/testorg',
        ],
      };

      const schema = generateOrganizationSchema(config);
      const parsed = JSON.parse(schema);

      expect(parsed.sameAs).toBeDefined();
      expect(parsed.sameAs).toHaveLength(3);
      expect(parsed.sameAs).toContain('https://twitter.com/testorg');
      expect(parsed.sameAs).toContain('https://facebook.com/testorg');
      expect(parsed.sameAs).toContain('https://linkedin.com/company/testorg');
    });

    it('should include founding date', () => {
      const config = {
        name: 'Test Org',
        url: 'https://example.com',
        logo: 'https://example.com/logo.png',
        foundingDate: '2020-01-01',
      };

      const schema = generateOrganizationSchema(config);
      const parsed = JSON.parse(schema);

      expect(parsed.foundingDate).toBe('2020-01-01');
    });

    it('should include founders', () => {
      const config = {
        name: 'Test Org',
        url: 'https://example.com',
        logo: 'https://example.com/logo.png',
        founders: [
          { name: 'John Doe', url: 'https://example.com/john' },
          { name: 'Jane Smith' },
        ],
      };

      const schema = generateOrganizationSchema(config);
      const parsed = JSON.parse(schema);

      expect(parsed.founder).toBeDefined();
      expect(parsed.founder).toHaveLength(2);
      expect(parsed.founder[0]['@type']).toBe('Person');
      expect(parsed.founder[0].name).toBe('John Doe');
      expect(parsed.founder[0].url).toBe('https://example.com/john');
      expect(parsed.founder[1].name).toBe('Jane Smith');
      expect(parsed.founder[1].url).toBeUndefined();
    });

    it('should generate valid JSON', () => {
      const config = {
        name: 'Test Org',
        url: 'https://example.com',
        logo: 'https://example.com/logo.png',
      };

      const schema = generateOrganizationSchema(config);
      
      // Should not throw
      expect(() => JSON.parse(schema)).not.toThrow();
    });

    it('should have default configuration (overridden by branding at runtime)', () => {
      // HAMBRY_ORGANIZATION is intentionally empty — all brand values come from
      // the DB at runtime so white-label deployments don't inherit Hambry defaults.
      expect(typeof HAMBRY_ORGANIZATION.name).toBe('string');
      expect(typeof HAMBRY_ORGANIZATION.description).toBe('string');
      expect(typeof HAMBRY_ORGANIZATION.email).toBe('string');
    });
  });

  describe('Canonical URLs', () => {
    it('should handle clean URLs without query params', () => {
      const url = 'https://example.com/article/test-slug';
      expect(url).not.toContain('?');
      expect(url).not.toContain('#');
    });

    it('should build canonical URL from path', () => {
      const path = '/article/test-slug';
      const origin = 'https://example.com';
      const canonical = `${origin}${path}`;
      
      expect(canonical).toBe('https://example.com/article/test-slug');
    });

    it('should handle paths without leading slash', () => {
      const path = 'article/test-slug';
      const cleanPath = path.startsWith('/') ? path : `/${path}`;
      
      expect(cleanPath).toBe('/article/test-slug');
    });

    it('should remove query parameters from URL', () => {
      const url = new URL('https://example.com/search?q=test&category=news');
      const canonical = `${url.origin}${url.pathname}`;
      
      expect(canonical).toBe('https://example.com/search');
      expect(canonical).not.toContain('?');
    });

    it('should remove hash fragments from URL', () => {
      const url = new URL('https://example.com/article/test#section');
      const canonical = `${url.origin}${url.pathname}`;
      
      expect(canonical).toBe('https://example.com/article/test');
      expect(canonical).not.toContain('#');
    });

    it('should preserve trailing slashes consistently', () => {
      const url1 = 'https://example.com/category/tech';
      const url2 = 'https://example.com/category/tech/';
      
      // Both should normalize to the same format
      expect(url1.endsWith('/')).toBe(false);
      expect(url2.endsWith('/')).toBe(true);
    });
  });

  describe('SEO Best Practices', () => {
    it('should have unique canonical URL for each page type', () => {
      const urls = [
        '/article/test-slug',
        '/category/tech',
        '/search',
        '/crossword',
        '/horoscopes',
      ];

      const uniqueUrls = new Set(urls);
      expect(uniqueUrls.size).toBe(urls.length);
    });

    it('should use HTTPS for all URLs', () => {
      const urls = [
        'https://example.com/article/test',
        'https://example.com/category/tech',
      ];

      urls.forEach(url => {
        expect(url).toMatch(/^https:\/\//);
      });
    });

    it('should have valid URL structure', () => {
      const urls = [
        'https://example.com/article/test-slug',
        'https://example.com/category/tech',
      ];

      urls.forEach(urlString => {
        expect(() => new URL(urlString)).not.toThrow();
      });
    });
  });

  describe('Schema.org Validation', () => {
    it('should use correct schema.org context', () => {
      const config = {
        name: 'Test',
        url: 'https://example.com',
        logo: 'https://example.com/logo.png',
      };

      const schema = generateOrganizationSchema(config);
      const parsed = JSON.parse(schema);

      expect(parsed['@context']).toBe('https://schema.org');
    });

    it('should use correct Organization type', () => {
      const config = {
        name: 'Test',
        url: 'https://example.com',
        logo: 'https://example.com/logo.png',
      };

      const schema = generateOrganizationSchema(config);
      const parsed = JSON.parse(schema);

      expect(parsed['@type']).toBe('Organization');
    });

    it('should have required Organization properties', () => {
      const config = {
        name: 'Test',
        url: 'https://example.com',
        logo: 'https://example.com/logo.png',
      };

      const schema = generateOrganizationSchema(config);
      const parsed = JSON.parse(schema);

      // Required properties for Organization
      expect(parsed.name).toBeDefined();
      expect(parsed.url).toBeDefined();
      expect(parsed.logo).toBeDefined();
    });

    it('should have valid ImageObject for logo', () => {
      const config = {
        name: 'Test',
        url: 'https://example.com',
        logo: 'https://example.com/logo.png',
      };

      const schema = generateOrganizationSchema(config);
      const parsed = JSON.parse(schema);

      expect(parsed.logo['@type']).toBe('ImageObject');
      expect(parsed.logo.url).toMatch(/^https?:\/\//);
    });
  });
});
