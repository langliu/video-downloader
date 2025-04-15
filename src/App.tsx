import { useEffect, useState } from "react";
import { Command } from "@tauri-apps/plugin-shell";
import { Button, Form, Input, Select } from "antd";
import { LazyStore } from "@tauri-apps/plugin-store";
import "./App.css";

function App() {
  const store = new LazyStore("settings.json");
  const [downloading, setDownloading] = useState(false);
  const [form] = Form.useForm();
  const [stdout, setStdout] = useState("");


  const onFinish = async (values: any) => {
    await store.set("cookie", values.cookie);
    setStdout("");
    setDownloading(true);
    Command.create("f2", [
      "dy",
      "-M",
      values.mode,
      "-u",
      values.url,
      "-p",
      "~/Downloads",
      "--cookie",
      values.cookie,
    ])
      .execute()
      .then((res) => {
        setStdout(res.stdout);
      })
      .catch((err) => {
        console.log(err);
      })
      .finally(() => {
        setDownloading(false);
      });
  };

  useEffect(() => {
    store.get("cookie").then((res) => {
      form.setFieldValue("cookie", res);
    });
  }, []);

  return (
    <main className="p-4">
      <h1 className="text-2xl font-bold text-center">F2下载</h1>
      <Form form={form} labelCol={{ span: 3 }} onFinish={onFinish}>
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
      <pre>{stdout}</pre>
    </main>
  );
}

export default App;
