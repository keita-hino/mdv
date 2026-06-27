# サンプル仕様書

これは Markdown Viewer の動作確認用サンプルです。

## 概要

SDD（仕様駆動開発）で作成する仕様書のイメージ。GFM のテーブルやチェックリスト、
コードブロック、Mermaid 図が含まれます。

### 要件チェックリスト

- [x] Markdown を閲覧できる
- [x] Mermaid ER図のテーブル名をダブルクリックで選択できる
- [ ] git差分を Markdown 形式で閲覧できる

### GFM テーブル

| 機能 | 状態 | 優先度 |
| --- | --- | --- |
| Markdown閲覧 | 完了 | 高 |
| Mermaid選択 | 完了 | 高 |
| git差分 | 確認中 | 中 |

## ER図（ダブルクリックでテーブル名を選択してみてください）

```mermaid
erDiagram
    CUSTOMER ||--o{ ORDER : places
    ORDER ||--|{ ORDER_ITEM : contains
    PRODUCT ||--o{ ORDER_ITEM : "ordered in"
    CUSTOMER {
        int id PK
        string name
        string email
    }
    ORDER {
        int id PK
        int customer_id FK
        datetime created_at
    }
    ORDER_ITEM {
        int id PK
        int order_id FK
        int product_id FK
        int quantity
    }
    PRODUCT {
        int id PK
        string name
        decimal price
    }
```

## フローチャート

```mermaid
flowchart TD
    A[開始] --> B{条件分岐}
    B -->|Yes| C[処理1]
    B -->|No| D[処理2]
    C --> E[終了]
    D --> E
```

## コードブロック（シンタックスハイライト）

```typescript
function greet(name: string): string {
  return `Hello, ${name}!`
}
```

```python
def add(a: int, b: int) -> int:
    return a + b
```
