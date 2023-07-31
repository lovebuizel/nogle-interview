"use client";
import styles from "./page.module.scss";
import { useEffect, useMemo, useRef, useState } from "react";
import useWebSocket from "react-use-websocket";
import cx from "classnames";
import ArrowDownIcon from "./images/arrowDown.svg";

const LAST_PRICE_STYLE = {
  higher: {
    color: "#00b15d",
    bgColor: "rgba(16, 186, 104, 0.12)",
    arrowDownStyle: {
      transform: "rotate(180deg)",
      display: "block",
    },
  },
  lower: {
    color: "#FF5B5A",
    bgColor: "rgba(255, 90, 90, 0.12)",
    arrowDownStyle: {
      transform: "rotate(0deg)",
      display: "block",
    },
  },
  equal: {
    color: "#F0F4F8",
    bgColor: "rgba(134, 152, 170, 0.12)",
    arrowDownStyle: {
      transform: "rotate(0deg)",
      display: "none",
    },
  },
};

// max number 50
const MAX_QUOTE = 8;

const priceFormatter = (number: number) => {
  return new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 1,
  }).format(number);
};

const sizeFormatter = (number: number) => {
  return new Intl.NumberFormat().format(number);
};

export default function Home() {
  const { sendMessage, lastMessage } = useWebSocket(
    "wss://ws.btse.com/ws/oss/futures"
  );
  const {
    sendMessage: sendLastPriceMessage,
    lastMessage: lastPricelastMessage,
  } = useWebSocket("wss://ws.btse.com/ws/futures");
  const [lastPrice, setLastPrice] = useState("0");
  const seqNumRef = useRef(0);
  const [askQuotePriceMap, setAskQuotePriceMap] = useState<any>({});
  const [bidQuotePriceMap, setBidQuotePriceMap] = useState<any>({});

  const [askNewPriceMap, setAskNewPriceMap] = useState<any>({});
  const [bidNewPriceMap, setBidNewPriceMap] = useState<any>({});

  const [asks, setAsks] = useState<any>([]);
  const [bids, setBids] = useState<any>([]);

  useEffect(() => {
    if (lastMessage !== null) {
      const data = JSON.parse(lastMessage.data).data;
      if (data && data.type === "snapshot") {
        setAsks(data.asks);
        setBids(data.bids);
        seqNumRef.current = data.seqNum;
      }
      if (data && data.type === "delta") {
        if (data.prevSeqNum !== seqNumRef.current) {
          sendMessage('{"op": "unsubscribe","args": ["update:BTCPFC_0"]}');
          sendMessage('{"op": "subscribe","args": ["update:BTCPFC_0"]}');
        }
        seqNumRef.current = data.seqNum;
        setAsks((preState: any) => {
          let temp: any = [...preState];
          for (let i = 0; i < data.asks.length; i++) {
            if (data.asks[i][1] === "0") {
              const index = temp.findIndex(
                (ele: string) => ele === data.asks[i][0]
              );
              if (index !== -1) {
                temp.splice(index, 1);
              }
            } else {
              const index = temp.findIndex(
                (ele: string) => ele[0] === data.asks[i][0]
              );
              if (index !== -1) {
                if (parseInt(data.asks[i][1]) > parseInt(temp[index][1])) {
                  setAskQuotePriceMap((preState: any) => ({
                    ...preState,
                    [data.asks[i][0]]: "size_increase",
                  }));
                } else if (
                  parseInt(data.asks[i][1]) < parseInt(temp[index][1])
                ) {
                  setAskQuotePriceMap((preState: any) => ({
                    ...preState,
                    [data.asks[i][0]]: "size_decrease",
                  }));
                }
                temp[index][1] = data.asks[i][1];
              } else {
                temp.push(data.asks[i]);
                temp.sort(
                  (a: any, b: any) => parseFloat(b[0]) - parseFloat(a[0])
                );
                setAskNewPriceMap((preState: any) => ({
                  ...preState,
                  [data.asks[i][0]]: "new_price",
                }));
              }
            }
          }
          return temp;
        });
        setBids((preState: any) => {
          let temp: any = [...preState];
          for (let i = 0; i < data.bids.length; i++) {
            if (data.bids[i][1] === "0") {
              const index = temp.findIndex(
                (ele: string) => ele === data.bids[i][0]
              );
              if (index !== -1) {
                temp.splice(index, 1);
              }
            } else {
              const index = temp.findIndex(
                (ele: string) => ele[0] === data.bids[i][0]
              );
              if (index !== -1) {
                if (parseInt(data.bids[i][1]) > parseInt(temp[index][1])) {
                  setBidQuotePriceMap((preState: any) => ({
                    ...preState,
                    [data.bids[i][0]]: "size_increase",
                  }));
                } else if (
                  parseInt(data.bids[i][1]) < parseInt(temp[index][1])
                ) {
                  setBidQuotePriceMap((preState: any) => ({
                    ...preState,
                    [data.bids[i][0]]: "size_decrease",
                  }));
                }
                temp[index][1] = data.bids[i][1];
              } else {
                temp.push(data.bids[i]);
                temp.sort(
                  (a: any, b: any) => parseFloat(b[0]) - parseFloat(a[0])
                );
                setBidNewPriceMap((preState: any) => ({
                  ...preState,
                  [data.bids[i][0]]: "new_price",
                }));
              }
            }
          }
          return temp;
        });
      }
    }
  }, [lastMessage, sendMessage]);

  const [lastPriceStyle, setlastPriceStyle] = useState(LAST_PRICE_STYLE.equal);
  useEffect(() => {
    if (lastPricelastMessage !== null) {
      const data = JSON.parse(lastPricelastMessage.data).data;
      if (data && data[0]) {
        setLastPrice((prePrice) => {
          if (parseFloat(data[0].price) > parseFloat(prePrice)) {
            setlastPriceStyle(LAST_PRICE_STYLE.higher);
          } else if (parseFloat(data[0].price) < parseFloat(prePrice)) {
            setlastPriceStyle(LAST_PRICE_STYLE.lower);
          } else {
            setlastPriceStyle(LAST_PRICE_STYLE.equal);
          }
          return data[0].price;
        });
      }
    }
  }, [lastPricelastMessage]);

  useEffect(() => {
    sendMessage('{"op": "subscribe","args": ["update:BTCPFC_0"]}');
    return () =>
      sendMessage('{"op": "unsubscribe","args": ["update:BTCPFC_0"]}');
  }, [sendMessage]);

  useEffect(() => {
    sendLastPriceMessage(
      '{"op": "subscribe","args": ["tradeHistoryApi:BTCPFC"]}'
    );
    return () =>
      sendLastPriceMessage(
        '{"op": "unsubscribe","args": ["tradeHistoryApi:BTCPFC"]}'
      );
  }, [sendLastPriceMessage]);

  const maxTotal = useMemo(() => {
    const asksTotal = asks
      .slice(asks.length - MAX_QUOTE)
      .reduce((acc: number, cur: any) => acc + parseInt(cur[1]), 0);
    const bidsTodal = bids
      .slice(0, MAX_QUOTE)
      .reduce((acc: number, cur: any) => acc + parseInt(cur[1]), 0);
    return Math.max(asksTotal, bidsTodal);
  }, [asks, bids]);

  return (
    <div style={{ padding: 10 }}>
      <div
        style={{
          maxWidth: 250,
          backgroundColor: "#131B29",
          color: "#F0F4F8",
          display: "flex",
          flexDirection: "column",
          textAlign: "right",
        }}
      >
        <div
          style={{
            display: "flex",
            padding: "5px 10px 0",
            color: "#8698aa",
            fontSize: "12px",
          }}
        >
          <div
            style={{ flex: "1 1 27%", whiteSpace: "nowrap", fontWeight: 400 }}
          >
            {"Price (USD)"}
          </div>
          <div
            style={{ flex: "1 1 27%", whiteSpace: "nowrap", fontWeight: 400 }}
          >
            Size
          </div>
          <div
            style={{ flex: "1 1 46%", whiteSpace: "nowrap", fontWeight: 400 }}
          >
            Total
          </div>
        </div>
        <div
          style={{
            display: "flex",
            padding: "4px 0 3px",
            flexDirection: "column",
          }}
        >
          {asks.slice(asks.length - MAX_QUOTE).map((ele: any, i: number) => {
            const asksTotal = asks
              .slice(asks.length - MAX_QUOTE)
              .slice(i)
              .reduce((acc: number, cur: any) => acc + parseInt(cur[1]), 0);
            return (
              <div
                className={cx(styles.order_book_quote, {
                  [styles.ask_new_price]:
                    askNewPriceMap[ele[0]] === "new_price",
                })}
                onAnimationEnd={() => {
                  setAskNewPriceMap((preState: any) => {
                    const temp = { ...preState };
                    delete temp[ele[0]];
                    return temp;
                  });
                }}
                key={ele[0]}
              >
                <div
                  style={{ flex: "1 1 27%", color: "#FF5B5A", fontWeight: 500 }}
                >
                  {priceFormatter(parseFloat(ele[0]))}
                </div>
                <div
                  style={{ flex: "1 1 27%", marginLeft: 7, fontWeight: 500 }}
                  className={cx({
                    [styles.size_increase]:
                      askQuotePriceMap[ele[0]] === "size_increase",
                    [styles.size_decrease]:
                      askQuotePriceMap[ele[0]] === "size_decrease",
                  })}
                  onAnimationEnd={() => {
                    setAskQuotePriceMap((preState: any) => {
                      const temp = { ...preState };
                      delete temp[ele[0]];
                      return temp;
                    });
                  }}
                >
                  {sizeFormatter(parseFloat(ele[1]))}
                </div>
                <div
                  style={{
                    flex: "1 1 46%",
                    position: "relative",
                    overflow: "hidden",
                    marginLeft: 7,
                    fontWeight: 500,
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      width: "100%",
                      height: "100%",
                      top: 0,
                      right: 0,
                      backgroundColor: "rgba(255, 90, 90, 0.12)",
                      transform: `translateX(${
                        100 - (asksTotal / maxTotal) * 100
                      }%)`,
                    }}
                  />
                  <div
                    style={{
                      position: "absolute",
                      top: 0,
                      right: 0,
                    }}
                  >
                    {sizeFormatter(asksTotal)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div
          className={styles.last_price}
          style={{
            color: lastPriceStyle.color,
            backgroundColor: lastPriceStyle.bgColor,
          }}
        >
          {priceFormatter(parseFloat(lastPrice))}
          <ArrowDownIcon
            style={{
              marginLeft: 4,
              width: 16,
              height: 16,
              ...lastPriceStyle.arrowDownStyle,
            }}
          />
        </div>
        <div
          style={{
            display: "flex",
            padding: "4px 0 3px",
            flexDirection: "column",
          }}
        >
          {bids.slice(0, MAX_QUOTE).map((ele: any, i: number) => {
            const bidsTotal = bids
              .slice(0, MAX_QUOTE)
              .slice(0, i + 1)
              .reduceRight(
                (acc: number, cur: any) => acc + parseInt(cur[1]),
                0
              );
            return (
              <div
                className={cx(styles.order_book_quote, {
                  [styles.bid_new_price]:
                    bidNewPriceMap[ele[0]] === "new_price",
                })}
                onAnimationEnd={() => {
                  setBidNewPriceMap((preState: any) => {
                    const temp = { ...preState };
                    delete temp[ele[0]];
                    return temp;
                  });
                }}
                key={ele[0]}
              >
                <div
                  style={{ flex: "1 1 27%", color: "#00b15d", fontWeight: 500 }}
                >
                  {priceFormatter(parseFloat(ele[0]))}
                </div>
                <div
                  style={{ flex: "1 1 27%", marginLeft: 7, fontWeight: 500 }}
                  className={cx({
                    [styles.size_increase]:
                      bidQuotePriceMap[ele[0]] === "size_increase",
                    [styles.size_decrease]:
                      bidQuotePriceMap[ele[0]] === "size_decrease",
                  })}
                  onAnimationEnd={() => {
                    setBidQuotePriceMap((preState: any) => {
                      const temp = { ...preState };
                      delete temp[ele[0]];
                      return temp;
                    });
                  }}
                >
                  {sizeFormatter(parseFloat(ele[1]))}
                </div>
                <div
                  style={{
                    flex: "1 1 46%",
                    position: "relative",
                    overflow: "hidden",
                    marginLeft: 7,
                    fontWeight: 500,
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      width: "100%",
                      height: "100%",
                      top: 0,
                      right: 0,
                      backgroundColor: "rgba(16, 186, 104, 0.12)",
                      transform: `translateX(${
                        100 - (bidsTotal / maxTotal) * 100
                      }%)`,
                    }}
                  />
                  <div
                    style={{
                      position: "absolute",
                      top: 0,
                      right: 0,
                    }}
                  >
                    {sizeFormatter(bidsTotal)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
