import { NvPageHead } from "../components/atoms";
import SalesStatus from "../components/SalesStatus";

export default function Orders() {
  return (
    <>
      <NvPageHead title="판매 현황" sub="스토어 판매·정산 현황을 한눈에 봐요." />
      <SalesStatus />
    </>
  );
}
