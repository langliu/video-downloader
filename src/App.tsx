import { useEffect, useState } from "react";
import { Command } from "@tauri-apps/plugin-shell";
import { invoke } from "@tauri-apps/api/core";
import { Button, Form, Input, Select } from "antd";
import { LazyStore } from "@tauri-apps/plugin-store";
import { info } from "@tauri-apps/plugin-log";
// import { BaseDirectory, exists } from "@tauri-apps/plugin-fs";
import "./App.css";

function App() {
  const store = new LazyStore("settings.json");
  const [downloading, setDownloading] = useState(false);
  const [form] = Form.useForm();
  const [username, setUsername] = useState("");
  const [stdout, setStdout] = useState("");

  const onFinish = async (values: any) => {
    await store.set("cookie", values.cookie);
    setStdout("");
    setDownloading(true);
    info(`start download ${values.mode} ${values.url}`);
    // await exists(`/Users/${username}/Downloads`, {});

    const command = Command.create("f2", [
      "dy",
      "-M",
      values.mode,
      "-u",
      values.url,
      "-p",
      `/Users/${username}/Downloads`,
      "--cookie",
      values.cookie,
    ]);

    command.stdout.on("data", (line) => {
      console.log("stdout data", line);
      info(`stdout data ${line}`);
      setStdout((prev) => prev + line);
    });

    command.stderr.on("data", (line) => {
      setStdout((prev) => prev + "Error: " + line + "\n");
    });

    command.on("close", () => {
      setDownloading(false);
    });

    command.on("error", (error) => {
      console.error("Command error:", error);
      setDownloading(false);
    });
    command.execute();
  };

  function getUsername() {
    invoke<string>("get_system_username").then((res) => {
      console.log(res);
      setUsername(res);
    });
  }

  useEffect(() => {
    store.get("cookie").then((res) => {
      form.setFieldValue("cookie", res);
    });
    getUsername();
  }, []);

  return (
    <main className="p-4">
      <h1 className="text-2xl font-bold text-center">
        Hello {username} F2下载
      </h1>
      <Form
        form={form}
        labelCol={{ span: 3 }}
        onFinish={onFinish}
        disabled={downloading}
      >
        <Form.Item name={"cookie"} label="Cookie" rules={[{ required: true }]}>
          <Input.TextArea placeholder="请输入Cookie" rows={4} />
        </Form.Item>
        <Form.Item name="mode" label="下载模式" rules={[{ required: true }]}>
          <Select placeholder="请选择URL对应的下载模式" allowClear>
            <Select.Option value="one">单个作品</Select.Option>
            <Select.Option value="post">主页作品</Select.Option>
            <Select.Option value="like">点赞作品</Select.Option>
            <Select.Option value="collection">收藏作品</Select.Option>
            <Select.Option value="collects">收藏夹作品</Select.Option>
            <Select.Option value="music">收藏音乐</Select.Option>
            <Select.Option value="mix">合集</Select.Option>
            <Select.Option value="live">直播</Select.Option>
          </Select>
        </Form.Item>
        <Form.Item
          name={"url"}
          label="链接"
          rules={[
            { required: true, type: "url", message: "请输入正确的URL地址" },
          ]}
        >
          <Input placeholder="请输入链接" />
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit" loading={downloading}>
            F2下载
          </Button>
        </Form.Item>
      </Form>
      <pre className="mt-4 p-4 bg-gray-100 rounded-lg overflow-auto max-h-96">
        {stdout}
      </pre>
    </main>
  );
}

export default App;
