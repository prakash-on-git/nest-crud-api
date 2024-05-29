import { Test } from "@nestjs/testing";
import { AppModule } from "../src/app.module";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import { PrismaService } from "../src/prisma/prisma.service";
import * as pactum from 'pactum';
import { AuthDto } from "src/auth/dto";
import { EditUserDto } from "src/user/dto";
import { CreateBookmarkDto, EditBookmarkDto } from '../src/bookmark/dto';

describe('App e2e', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule], }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes( new ValidationPipe({   whitelist: true, }));
    await app.init();
    await app.listen(3333);

    prisma = app.get(PrismaService);
    await prisma.cleanDb();
    pactum.request.setBaseUrl('http://localhost:3333')
  });

  afterAll(()=>{
    app.close();
  })

  describe('Auth', ()=>{
    const dto: AuthDto ={email: 'prakashtest@gmail.com', password: 'test'}
    describe('Signup', ()=>{
      it('If email empty', () => {
        return pactum
          .spec()
          .post('/auth/signup')
          .withBody({ password: "test"})
          .expectStatus(400);
      });

      it('If password empty', () => {
        return pactum
          .spec()
          .post('/auth/signup')
          .withBody({ email: dto.email})
          .expectStatus(400);
      });

      it('If email and password empty', () => {
        return pactum
          .spec()
          .post('/auth/signup')
          .withBody({})
          .expectStatus(400);
      });

      it('Should Signup', () => {
        return pactum
          .spec()
          .post('/auth/signup')
          .withBody(dto)
          .expectStatus(201);
      });
    });

    describe('Signin', ()=>{

      it('If email empty', () => {
        return pactum
          .spec()
          .post('/auth/signin')
          .withBody({ password: "test"})
          .expectStatus(400);
      });

      it('If password empty', () => {
        return pactum
          .spec()
          .post('/auth/signin')
          .withBody({ email: dto.email})
          .expectStatus(400);
      });

      it('If email and password empty', () => {
        return pactum
          .spec()
          .post('/auth/signin')
          .withBody({})
          .expectStatus(400);
      });

      it('Should Signin', ()=>{
        return pactum
          .spec()
          .post('/auth/signin')
          .withBody(dto)
          .expectStatus(200)
          .stores('userAt', 'access_token')
      });
    });
  });
  
  describe('User', ()=>{
    describe('Get me', ()=>{

      it('Should get User', ()=>{
        return pactum
          .spec()
          .get('/users/me')
          .withHeaders({
            Authorization: 'Bearer $S{userAt}'
          })
          .expectStatus(200)
      });

    });
    describe('Edit User', ()=>{
      it('Edit user', ()=>{
        const dto: EditUserDto = {
          firstName: "Prakash",
          email: "prakashjhandls@gmail.com"
        }
        return pactum
          .spec()
          .patch('/users')
          .withHeaders({
            Authorization: 'Bearer $S{userAt}'
          })
          .withBody(dto)
          .expectStatus(200)
          .expectBodyContains(dto.firstName);
      });
    });
  });

  describe('Bookmarks', ()=>{

    describe('Create Bookmark', ()=>{
      const dto: CreateBookmarkDto = {
        title: 'Git prifile',
        link: 'https://github.com/prakash-on-git?tab=repositories',
      };
      it('should create bookmark', () => {
        return pactum
          .spec()
          .post('/bookmarks')
          .withHeaders({ Authorization: 'Bearer $S{userAt}',})
          .withBody(dto)
          .expectStatus(201)
          .stores('bookmarkId', 'id');
      });
    });

    describe('Get Bookmarks', ()=>{
      it('Get bookmarks', () => {
        return pactum
          .spec()
          .get('/bookmarks')
          .withHeaders({ Authorization: 'Bearer $S{userAt}', })
          .expectStatus(200)
          .expectJsonLength(1);
      });
    });

    describe('Get Bookmark by id', ()=>{
      it('Get bookmark by id', () => {
        return pactum
          .spec()
          .get('/bookmarks/{id}')
          .withPathParams('id', '$S{bookmarkId}')
          .withHeaders({ Authorization: 'Bearer $S{userAt}', })
          .expectStatus(200)
          .expectBodyContains('$S{bookmarkId}'); //.expectJsonMatch({id: '$S{bookmarkId}'}) would have been the correct way of testing to prevent false positive matches with other numbers, user id etc.
      });
    });

    describe('Edit Bookmark', ()=>{
      const dto: EditBookmarkDto = {
        title: 'Bookmark title',
        description: 'Hello Description',
      };
      it('Edit bookmark', () => {
        return pactum
          .spec()
          .patch('/bookmarks/{id}')
          .withPathParams('id', '$S{bookmarkId}')
          .withHeaders({ Authorization: 'Bearer $S{userAt}',})
          .withBody(dto)
          .expectStatus(200)
          .expectBodyContains(dto.title)
          .expectBodyContains(dto.description);
      });
    });

    describe('Delete Bookmark', ()=>{
      it('delete bookmark', () => {
        return pactum
          .spec()
          .delete('/bookmarks/{id}')
          .withPathParams('id', '$S{bookmarkId}')
          .withHeaders({ Authorization: 'Bearer $S{userAt}',})
          .expectStatus(204);
      });

      it('get empty bookmarks', () => {
        return pactum
          .spec()
          .get('/bookmarks')
          .withHeaders({ Authorization: 'Bearer $S{userAt}', })
          .expectStatus(200)
          .expectJsonLength(0);
      });
    });
  });
});
