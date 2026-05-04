# 协作 AI 聊天室部署指南

这个项目允许两个用户进入同一个房间，实时看到对方的消息，并共同向 AI 提问。

## 1. 准备工作

你需要两个免费的服务账号：

1.  **[Supabase](https://supabase.com/)** (提供实时数据库)
    *   创建一个新项目。
    *   在 **SQL Editor** 中运行以下代码创建表：
        ```sql
        create table messages (
          id uuid default gen_random_uuid() primary key,
          created_at timestamp with time zone default timezone('utc'::text, now()) not null,
          text text not null,
          sender text not null,
          room_id text not null,
          is_ai boolean default false
        );

        -- 开启实时推送
        alter publication supabase_realtime add table messages;
        ```
    *   在 `Settings -> API` 找到 `URL` 和 `anon key`。

2.  **[Google AI Studio](https://aistudio.google.com/app/apikey)** (提供 Gemini API)
    *   点击 "Create API key"。

## 2. 本地运行

1.  将 `.env.example` 重命名为 `.env.local`。
2.  填入你的 API Keys。
3.  运行命令：
    ```bash
    npm install
    npm run dev
    ```

## 3. 部署上线 (获取网址)

最简单的方法是使用 **Vercel**：

1.  将代码上传到你的 GitHub 仓库。
2.  在 [Vercel](https://vercel.com/) 中点击 "Add New Project"。
3.  导入你的 GitHub 仓库。
4.  在 **Environment Variables** 中添加项目所需的所有 Key：
    *   `NEXT_PUBLIC_SUPABASE_URL`
    *   `NEXT_PUBLIC_SUPABASE_ANON_KEY`
    *   `GEMINI_API_KEY`
5.  点击 **Deploy**。

部署完成后，你会得到一个类似 `ai-collab-chat.vercel.app` 的网址。**发给朋友，进入同一个 Room ID，即可开始实时协作！**
