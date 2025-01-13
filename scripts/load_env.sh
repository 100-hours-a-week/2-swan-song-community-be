#!/bin/bash

# 외부에서 환경 값을 받아옴 (기본값: prod)
ENVIRONMENT="${1:-prod}"

# 필요한 Parameter 이름 목록
PARAMETERS=(
  "/ktb-community/$ENVIRONMENT/config/db-url"
  "/ktb-community/$ENVIRONMENT/config/db-port"
  "/ktb-community/$ENVIRONMENT/config/db-user"
  "/ktb-community/$ENVIRONMENT/config/db-password"
  "/ktb-community/$ENVIRONMENT/config/db-database"
  "/ktb-community/$ENVIRONMENT/config/db-connection-limit"
  "/ktb-community/$ENVIRONMENT/config/node/env"
  "/ktb-community/$ENVIRONMENT/config/port"
  "/ktb-community/$ENVIRONMENT/config/bucket-name"
)

# 파라미터 목록을 ", "로 구분된 문자열로 변환
PARAMETER_NAMES=$(printf " %s" "${PARAMETERS[@]}")
PARAMETER_NAMES=${PARAMETER_NAMES:1} # 맨 앞의 ", " 제거

# SSM Parameters 값 가져오기
RESPONSE=$(aws ssm get-parameters \
    --names $PARAMETER_NAMES \
    --with-decryption \
    --profile param)

# 각 파라미터를 환경 변수로 설정
for PARAM in "${PARAMETERS[@]}"; do
  VALUE=$(echo "$RESPONSE" | jq -r ".Parameters[] | select(.Name == \"$PARAM\") | .Value")

  # 에러 처리
  if [ -z "$VALUE" ]; then
    echo "Error: Unable to fetch parameter $PARAM"
    exit 1
  fi

  # 환경 변수 이름 변환
  VAR_NAME=$(echo "$PARAM" | sed 's|/ktb-community/.*/config/||g' | sed 's|[^a-zA-Z0-9]|_|g' | tr '[:lower:]' '[:upper:]')

  # 환경 변수 설정
  echo "$VAR_NAME=$VALUE"
done

# 환경 변수 설정
# load_env.sh > .env
