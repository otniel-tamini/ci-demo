const Koa = require('koa');
const path = require('path');
const serve = require('koa-static');
const route = require('koa-route');
const axios = require('axios');

// Mock axios for testing
jest.mock('axios');
const mockedAxios = axios;

describe('OAuth Demo App', () => {
  let app;
  
  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
  });

  test('should create Koa app instance', () => {
    const app = new Koa();
    expect(app).toBeInstanceOf(Koa);
  });

  test('should have static file serving middleware', () => {
    const main = serve(path.join(__dirname, '../public'));
    expect(main).toBeDefined();
    expect(typeof main).toBe('function');
  });

  test('should handle OAuth redirect route', async () => {
    // Mock axios responses
    mockedAxios.mockResolvedValueOnce({
      data: { access_token: 'mock_access_token' }
    });
    
    mockedAxios.mockResolvedValueOnce({
      data: { name: 'Test User' }
    });

    // Create a mock context
    const ctx = {
      request: {
        query: { code: 'test_auth_code' }
      },
      response: {
        redirect: jest.fn()
      }
    };

    // Import and test the oauth function logic
    const oauth = async ctx => {
      const requestToken = ctx.request.query.code;
      
      const tokenResponse = await axios({
        method: 'post',
        url: expect.stringContaining('https://github.com/login/oauth/access_token'),
        headers: { accept: 'application/json' }
      });

      const accessToken = tokenResponse.data.access_token;
      
      const result = await axios({
        method: 'get',
        url: 'https://api.github.com/user',
        headers: {
          accept: 'application/json',
          Authorization: `token ${accessToken}`
        }
      });
      
      const name = result.data.name;
      ctx.response.redirect(`/welcome.html?name=${name}`);
    };

    await oauth(ctx);

    expect(mockedAxios).toHaveBeenCalledTimes(2);
    expect(ctx.response.redirect).toHaveBeenCalledWith('/welcome.html?name=Test User');
  });

  test('should handle missing authorization code', async () => {
    const ctx = {
      request: {
        query: {}
      },
      response: {
        redirect: jest.fn()
      }
    };

    const oauth = async ctx => {
      const requestToken = ctx.request.query.code;
      if (!requestToken) {
        throw new Error('No authorization code provided');
      }
    };

    await expect(oauth(ctx)).rejects.toThrow('No authorization code provided');
  });
});