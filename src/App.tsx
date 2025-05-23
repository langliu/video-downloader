import { invoke } from '@tauri-apps/api/core'
import { open } from '@tauri-apps/plugin-dialog'
import { openPath } from '@tauri-apps/plugin-opener'
import { LazyStore } from '@tauri-apps/plugin-store'
import { Button, Form, Image, Input, Space, Table } from 'antd'
import { useEffect, useState } from 'react'
import type { ParsedURL } from './types'
import './App.css'

function App() {
  const store = new LazyStore('settings.json')
  const [downloading, setDownloading] = useState(false)
  const [form] = Form.useForm()
  const [videoList, setVideoList] = useState<ParsedURL[]>([])

  /**
   * 解析视频地址，获取无水印视频信息
   * @param url 视频地址
   */
  const parseUrl = async (url: string) => {
    const formData = new URLSearchParams()
    formData.append('token', 'uuic-qackd-fga-test')
    formData.append('link', url)

    const res = await fetch('https://proxy.layzz.cn/lyz/platAnalyse/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData,
    })
    const json = await res.json()
    console.log('res', json)
    if (json.code === '0001') {
      setVideoList((prev) => [...prev, json.data])
    }
  }

  /**
   * 单个视频下载
   * @param url 视频地址
   * @param fileName 文件名
   */
  async function downloadUrl(url: string, fileName: string) {
    const dir = await open({
      multiple: false,
      directory: true,
    })
    if (dir) {
      await invoke('download_video', {
        url,
        savePath: dir,
        fileName,
      })
      openPath(dir)
    }
  }

  async function batchDownload() {
    const dir = await open({
      multiple: false,
      directory: true,
    })
    if (dir) {
      setDownloading(true)
      for (const video of videoList) {
        await invoke('download_video', {
          url: video.playAddr,
          savePath: dir,
          fileName: `${video.desc}.mp4`,
        })
      }
      setDownloading(false)
      openPath(dir)
    }
  }

  const onFinish = async (values: { urls: string }) => {
    const { urls } = values
    const urlList = urls
      .split(/\n|,|，/)
      .map((url: string) => url.trim())
      .filter((url: string) => url)
    console.log(urlList)
    await store.set('urls', urls)
    await store.save()
    for (const url of urlList) {
      await parseUrl(url)
    }
  }

  const clearInput = () => {
    form.resetFields()
    setVideoList([])
  }

  useEffect(() => {
    store.get('urls').then((urls) => {
      if (urls) {
        form.setFieldsValue({ urls })
      }
    })
    store.get('videoList').then((videoList) => {
      console.log('videoList', videoList)
      if (videoList) {
        setVideoList(videoList as ParsedURL[])
      }
    })
  }, [])

  useEffect(() => {
    store.set('videoList', videoList).then(() => {
      store.save()
    })
  }, [videoList, store])

  return (
    <main className='p-4'>
      <h1 className='text-2xl font-bold text-center'>抖音视频无水印下载</h1>
      <Form form={form} labelCol={{ span: 3 }} onFinish={onFinish} disabled={downloading}>
        <Form.Item name={'urls'} label='视频地址' rules={[{ required: true }]}>
          <Input.TextArea placeholder='请输入视频地址，以换行或者逗号分隔' rows={4} />
        </Form.Item>
        <Form.Item>
          <Space>
            <Button type='primary' htmlType='submit' loading={downloading}>
              解析视频地址
            </Button>
            {videoList.length > 0 && (
              <>
                <Button
                  type='primary'
                  htmlType='button'
                  loading={downloading}
                  onClick={() => {
                    batchDownload()
                  }}
                >
                  下载视频
                </Button>
                <Button type='primary' htmlType='button' onClick={clearInput}>
                  清除输入
                </Button>
              </>
            )}
          </Space>
        </Form.Item>
      </Form>
      <Table
        dataSource={videoList}
        columns={[
          {
            title: '标题',
            dataIndex: 'desc',
            key: 'desc',
          },

          {
            title: '封面',
            dataIndex: 'cover',
            key: 'cover',
            render: (cover) => <Image src={cover} alt='cover' width={100} />,
            width: 100,
          },
          {
            title: '操作',
            key: 'action',
            render: (_, record) => (
              <Button
                type='link'
                htmlType='button'
                onClick={() => {
                  downloadUrl(record.playAddr, `${record.desc}.mp4`)
                }}
              >
                下载
              </Button>
            ),
            width: 100,
            align: 'center',
          },
        ]}
        rowKey={(record) => record.playAddr}
        pagination={false}
      />
    </main>
  )
}

export default App
