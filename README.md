# COMmunity (server)

## 🚀 프로젝트 소개

- **프로젝트 설명**: KTB 과제 실습의 간단한 커뮤니티 서비스입니다.
- **기술 스택**: JS, Express.js, MariaDB 등 사용 기술 소개.<br> [front repo](https://github.com/100-hours-a-week/2-swan-song-community-fe-react) <br>

## 📂 프로젝트 구조

```plaintext
project/
├── config        // DB 설정 등 설정 관련 js 파일 관리
├── controller    // 비즈니스 로직
├── dao           // DB 접근 쿼리 메소드
├── data          // InMemoryDB 저장용 디렉토리
├── logs          // log 저장
├── model         // 도메인 모델
├── public        // 공개적인 정적 파일 저장
├── routes        // router 저장
└── utils         // utility 로직
```

<br>

## 🔗 주요 API

`/api/v1` <br>

1️⃣ 인증 `/auth`

- POST `/signin` 로그인
- GET `/check-nickname` 닉네임 중복 여부 조회
- POST `/signup` 회원가입
- POST `/logout` 로그아웃
- DELETE `/withdrawal` 회원 탈퇴

2️⃣ 사용자 `/users`

- GET `/me` 로그인 회원 정보 조회
- PUT `/me` 회원정보 수정
- PATCH `/me/password` 회원 비밀번호 수정

3️⃣ 게시글 `/posts`

- GET `/:postId` 게시글 상세 정보 조회
- GET `/` 게시글 요약 정보 조회
- POST `/` 게시글 추가
- PUT `/:postId` 게시글 수정
- DELETE `/:postId` 게시글 삭제
- POST `/comments` 댓글 추가
- PUT `/comments` 댓글 수정
- DELETE `/comments` 댓글 삭제
- POST `/likes` 좋아요 추가
- DELETE `/likes` 좋아요 삭제

<br>

## 고민했던 부분

- 미들웨어를 통해 중앙에서 에러 로깅 및 핸들링
- InMemoryDB -> RDB 전환을 고려한 DAO 설계
- 프로젝트 내 image 백업 및 복원 설계
