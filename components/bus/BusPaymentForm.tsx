'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';

import { Input } from '@/components/ui/Input';
import { BusinessCheckoutNotice } from '@/components/business/BusinessCheckoutNotice';
import {
  clearActiveBusinessTravelRequest,
  readActiveBusinessTravelRequest,
} from '@/lib/businessTravelClient';
import { readJsonResponse } from '@/lib/api/clientResponse';
import { createBookingReference } from '@/lib/confirmationCode';

interface BusPaymentFormProps {
  bookingSummary: Record<string, string | number>;
  nextQuery: Record<string, string>;
}

interface AppliedPromotion {
  code: string;
  discountAmount: number;
  finalTotal: number;
  ruleVersion: number;
}

interface PromotionResponse {
  data?: AppliedPromotion;
  error?: { message?: string };
}

export function BusPaymentForm({ bookingSummary, nextQuery }: BusPaymentFormProps) {
  const router = useRouter();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [paid, setPaid] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [promotion, setPromotion] = useState<AppliedPromotion>();
  const [validatingPromotion, setValidatingPromotion] = useState(false);
  const subtotal = Number(bookingSummary.total);

  const money = (amount: number) =>
    new Intl.NumberFormat('en-IN', {
      currency: 'INR',
      maximumFractionDigits: 0,
      style: 'currency',
    }).format(amount);

  async function applyPromotion() {
    setValidatingPromotion(true);
    setPromotion(undefined);
    setErrors((current) => {
      const remaining = { ...current };
      delete remaining.promotion;
      return remaining;
    });

    try {
      const response = await fetch('/api/v1/promotions/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: promoCode,
          productType: 'BUS',
          subtotal,
        }),
      });
      const payload = await readJsonResponse<PromotionResponse>(response);

      if (!response.ok || !payload?.data) {
        setErrors((current) => ({
          ...current,
          promotion: payload?.error?.message ?? 'The promotion could not be validated.',
        }));
        return;
      }

      setPromoCode(payload.data.code);
      setPromotion(payload.data);
    } catch {
      setErrors((current) => ({
        ...current,
        promotion: 'The promotion service is temporarily unavailable.',
      }));
    } finally {
      setValidatingPromotion(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const cardholder = String(form.get('cardholder') ?? '').trim();
    const cardNumber = String(form.get('cardNumber') ?? '').replace(/\D/g, '');
    const expiry = String(form.get('expiry') ?? '').trim();
    const cvv = String(form.get('cvv') ?? '').replace(/\D/g, '');
    const nextErrors: Record<string, string> = {};
    if (cardholder.length < 3) nextErrors.cardholder = 'Enter the cardholder name.';
    if (cardNumber.length < 12 || cardNumber.length > 19)
      nextErrors.cardNumber = 'Enter 12 to 19 demonstration digits.';
    if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(expiry)) nextErrors.expiry = 'Use MM/YY format.';
    if (cvv.length < 3 || cvv.length > 4) nextErrors.cvv = 'Enter 3 or 4 digits.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    const passengerDraft = sessionStorage.getItem('mandyal-bus-passengers');
    if (!passengerDraft) {
      setErrors({ payment: 'Passenger details are missing. Please return and enter them again.' });
      return;
    }

    let parsedPassengerDraft: unknown;
    try {
      parsedPassengerDraft = JSON.parse(passengerDraft);
    } catch {
      setErrors({ payment: 'Passenger details are invalid. Please return and enter them again.' });
      return;
    }

    const businessRequest = readActiveBusinessTravelRequest();
    if (businessRequest && businessRequest.productType !== 'BUS') {
      setErrors({ payment: 'The active company approval is for a different travel product.' });
      return;
    }

    setProcessing(true);
    const confirmationCode = createBookingReference('MB');
    const finalTotal = promotion?.finalTotal ?? subtotal;
    const completedBooking = {
      ...bookingSummary,
      subtotal,
      discountAmount: promotion?.discountAmount ?? 0,
      promotionCode: promotion?.code,
      promotionRuleVersion: promotion?.ruleVersion,
      total: finalTotal,
      confirmationCode,
      passengerDraft: parsedPassengerDraft,
      paymentStatus: 'captured',
      documentQuery: new URLSearchParams(nextQuery).toString(),
    };
    try {
      const response = await fetch('/api/v1/account/trips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json'ïõ¶‰ËkºwµçVÄ&öö¶–æu&V6÷&BÒ°¢f–Æ&–Æ—G”Æö6´–C¢6öçfW'FVDÆö6²æ–BÀ¢6öæf—&ÖF–öä6öFS¢7&VFT&öö¶–æu&VfW&Væ6R‚tÕBr’À¢7&VFVDC¢æWrFFR‚’çFô•4õ7G&–ær‚’À¢7W'&Væ7“¢V÷FRæ7W'&Væ7’À¢wVW7C¢&WVW7BæwVW7BÀ¢†÷FVÅ6ÇVs¢&WVW7Bæ†÷FVÅ6ÇVrÀ¢–C¢7'—Fòç&æFöÕUT”B‚’À¢–ÖVçE7FGW3¢v6GW&VBrÀ¢V÷FT–C¢V÷FRæ–BÀ¢7FGW3¢v6öæf—&ÖVBrÀ¢F÷FÄÖ÷VçBÀ¢Ó° ¢6öç7B66W75Fö¶VâÒ7&VFT&öö¶–æt66W75Fö¶Vâ†–FV×÷FVæ7”¶W’“°¢6öç7B66W75Fö¶Vä†6‚Ò†6„&öö¶–æt66W75Fö¶Vâ†66W75Fö¶Vâ“°¢G'’°¢v—BF†—2æ&öö¶–æw2ç6fR†&öö¶–ærÂ–FV×÷FVæ7”¶W’Â66W75Fö¶Vä†6‚Â'W6–æW746öçFW‡B“°¢Ò6F6‚†W'&÷"’°¢G'’°¢v—BF†—2æÆö6·2ç&VÆV6R†6öçfW'FVDÆö6²æ–B“°¢Ò6F6‚‡&VÆV6TW'&÷"’°¢6öç6öÆRæW'&÷"‚t†÷FVÂf–Æ&–Æ—G’†öÆB&VÆV6Rf–ÆVBârÂ&VÆV6TW'&÷"“°¢Ğ¢–b†W'&÷"–ç7Fæ6Vöb'W6–æW74&öö¶–æu&WVW7EVæf–Æ&ÆTW'&÷"’°¢F‡&÷ræWr†÷FVÄ&öö¶–æu'VÆTW'&÷"€¢t%U4”äU55õ$UTU5EôÅ$TE•õU4TBrÀ¢uF†—26ö×ç’&WVW7B—2æòÆöævW"f–Æ&ÆRf÷"&öö¶–ærârÀ¢“°¢Ğ¢F‡&÷rW'&÷#°¢Ğ¢&WGW&â²66W75Fö¶VâÂ&öö¶–ærÓ°¢Ğ ¢7–æ2vWD&öö¶–æt'”6öæf—&ÖF–öä6öFR€¢6öFS¢7G&–ærÀ¢66W75Fö¶Vã¢7G&–ærÀ¢“¢&öÖ—6SÄ†÷FVÄ&öö¶–æu&V6÷&BÂVæFVf–æVCâ°¢&WGW&âF†—2æ&öö¶–æw2æf–æD'”6öæf—&ÖF–öä6öFR†6öFRÂ†6„&öö¶–æt66W75Fö¶Vâ†66W75Fö¶Vâ’“°¢Ğ ¢7–æ2vWDÖævVD&öö¶–ær€¢6öFS¢7G&–ærÀ¢66W75Fö¶Vã¢7G&–ærÀ¢“¢&öÖ—6SÄÖævVD†÷FVÄ&öö¶–ærÂVæFVf–æVCâ°¢6öç7B&öö¶–ærÒv—BF†—2ævWD&öö¶–æt'”6öæf—&ÖF–öä6öFR†6öFRÂ66W75Fö¶Vâ“°¢–b‚&öö¶–ær’°¢&WGW&âVæFVf–æVC°¢Ğ ¢&WGW&âF†—2æVç&–6„ÖævVD&öö¶–ær†&öö¶–ær“°¢Ğ ¢7–æ2vWDÖævVD&öö¶–ætf÷$wVW7B€¢6öFS¢7G&–ærÀ¢VÖ–Ã¢7G&–ærÀ¢“¢&öÖ—6SÄÖævVD†÷FVÄ&öö¶–ærÂVæFVf–æVCâ°¢6öç7B&öö¶–ærÒv—BF†—2æ&öö¶–æw2æf–æD'”6öæf—&ÖF–öä6öFTæDwVW7DVÖ–Â†6öFRÂVÖ–Â“°¢–b‚&öö¶–ær’°¢&WGW&âVæFVf–æVC°¢Ğ ¢&WGW&âF†—2æVç&–6„ÖævVD&öö¶–ær†&öö¶–ær“°¢Ğ ¢&—fFR7–æ2Vç&–6„ÖævVD&öö¶–ær†&öö¶–æs¢†÷FVÄ&öö¶–æu&V6÷&B“¢&öÖ—6SÄÖævVD†÷FVÄ&öö¶–æsâ°¢6öç7B¶†÷FVÂÂV÷FRÂÆFW7DÖVæFÖVçEÒÒv—B&öÖ—6RæÆÂ…°¢F†—2æ†÷FVÇ2ævWD†÷FVÄ'•6ÇVr†&öö¶–æræ†÷FVÅ6ÇVr’À¢F†—2çV÷FW2æf–æD'”–B†&öö¶–ærçV÷FT–B’À¢F†—2æÖVæFÖVçG2æf–æDÆFW7D'”&öö¶–æt–B†&öö¶–æræ–B’À¢Ò“°¢6öç7B&ööÒÒ†÷FVÃòç&öö×2æf–æB€¢†6æF–FFR’Óâ6æF–FFRç&ööÕG—T–BÓÓÒV÷FSòæf–Æ&–Æ—G”Æö6²ç&ööÕG—T–BÀ¢“°¢6öç7B&FUÆâÒ&ööÓòç&FUÆç2æf–æB‚†6æF–FFR’Óâ6æF–FFRæ–BÓÓÒV÷FSòç&FUÆä–B“°¢6öç7B&VgVæF&ÆRÒ—5&VgVæDVÆ–v–&ÆR€¢V÷FSòæ6†V6´–äFFRÀ¢&FUÆãòæ6æ6VÆÆF–öåöÆ–7’ç&VgVæF&ÆRóòfÇ6RÀ¢&FUÆãòæ6æ6VÆÆF–öåöÆ–7’æg&VT6æ6VÆÆF–öåVçF–Ä†÷W'4&Vf÷&T6†V6´–âÀ¢“°¢&WGW&â°¢ââæ&öö¶–ærÀ¢6æ6VÆÆF–öåöÆ–7“¢&FUÆãòæ6æ6VÆÆF–öåöÆ–7’æFW67&—F–öâÀ¢6†V6´–äFFS¢V÷FSòæ6†V6´–äFFRÇÂVæFVf–æVBÀ¢6†V6´÷WDFFS¢V÷FSòæ6†V6´÷WDFFRÇÂVæFVf–æVBÀ¢†÷FVÄæÖS¢†÷FVÃòææÖRóò&öö¶–æræ†÷FVÅ6ÇVrÀ¢ÆFW7DÖVæFÖVçBÀ¢&–6T6ö×öæVçG3¢V÷FSòæ6ö×öæVçG2À¢&FUÆäæÖS¢&FUÆãòææÖRÀ¢&VgVæF&ÆRÀ¢&ööÔæÖS¢&ööÓòææÖRÀ¢&öö×3¢V÷FSòç&öö×2À¢Ó°¢Ğ ¢7–æ26æ6VÄ&öö¶–ær†6öFS¢7G&–ærÂ66W75Fö¶Vã¢7G&–ær“¢&öÖ—6SÄÖævVD†÷FVÄ&öö¶–ærÂVæFVf–æVCâ°¢6öç7B&öö¶–ærÒv—BF†—2ævWDÖævVD&öö¶–ær†6öFRÂ66W75Fö¶Vâ“°¢–b‚&öö¶–ær’°¢&WGW&âVæFVf–æVC°¢Ğ ¢–b†&öö¶–ærç7FGW2ÓÓÒv6æ6VÆÆVBr’°¢&WGW&â&öö¶–æs°¢Ğ ¢v—BF†—2æ&öö¶–æw2æ6æ6VÂ†&öö¶–æræ–BÂ&öö¶–ærç&VgVæF&ÆRÓÓÒG'VR“°¢&WGW&âF†—2ævWDÖævVD&öö¶–ær†6öFRÂ66W75Fö¶Vâ“°¢Ğ ¢7–æ2&WVW7DÖVæFÖVçB€¢6öFS¢7G&–ærÀ¢66W75Fö¶Vã¢7G&–ærÀ¢&WVW7C¢²&V6öã¢7G&–æs²&WVW7FVD6†V6´–äFFS¢7G&–æs²&WVW7FVD6†V6´÷WDFFS¢7G&–ærÒÀ¢“¢&öÖ—6SÄÖævVD†÷FVÄ&öö¶–ærÂVæFVf–æVCâ°¢6öç7B&öö¶–ærÒv—BF†—2ævWDÖævVD&öö¶–ær†6öFRÂ66W75Fö¶Vâ“°¢–b‚&öö¶–ær’°¢&WGW&âVæFVf–æVC°¢Ğ ¢–b†&öö¶–ærç7FGW2ÓÒv6öæf—&ÖVBr’°¢F‡&÷ræWr†÷FVÄ&öö¶–æu'VÆTW'&÷"€¢t$ôô´”äuôäõEôÔTäD$ÄRrÀ¢töæÇ’6öæf—&ÖVB&öö¶–æw26â&RÖVæFVBârÀ¢“°¢Ğ ¢6öç7Bæ–v‡G2Ò6Æ7VÆFTæ–v‡G2‡&WVW7Bç&WVW7FVD6†V6´–äFFRÂ&WVW7Bç&WVW7FVD6†V6´÷WDFFR“°¢6öç7BFöF’ÒæWrFFR‚’çFô•4õ7G&–ær‚’ç6Æ–6RƒÂ“°¢–b‚çVÖ&W"æ—4f–æ—FR†æ–v‡G2’ÇÂæ–v‡G2ÂÇÂ&WVW7Bç&WVW7FVD6†V6´–äFFRÂFöF’’°¢F‡&÷ræWr†÷FVÄ&öö¶–æu'VÆTW'&÷"€¢t”ådÄ”EôÔTäDÔTåEôDDU2rÀ¢u&WVW7FVBFFW2×W7BFW67&–&RgWGW&R7F’öbBÆV7BöæRæ–v‡BârÀ¢“°¢Ğ ¢–b€¢&WVW7Bç&WVW7FVD6†V6´–äFFRÓÓÒ&öö¶–æræ6†V6´–äFFRb`¢&WVW7Bç&WVW7FVD6†V6´÷WDFFRÓÓÒ&öö¶–æræ6†V6´÷WDFFP¢’°¢F‡&÷ræWr†÷FVÄ&öö¶–æu'VÆTW'&÷"€¢tÔTäDÔTåEõTä4„ätTBrÀ¢t6†ö÷6RFFW2F†B&RF–ffW&VçBg&öÒF†R7W'&VçB7F’ârÀ¢“°¢Ğ ¢–b†&öö¶–æræÆFW7DÖVæFÖVçCòç7FGW2ÓÓÒwVæF–ærr’°¢F‡&÷ræWr†÷FVÄ&öö¶–æu'VÆTW'&÷"€¢tÔTäDÔTåEôÅ$TE•õTäD”ärrÀ¢tâÖVæFÖVçB&WVW7B—2Ç&VG’VæF–ærf÷"F†—2&öö¶–ærârÀ¢“°¢Ğ ¢v—BF†—2æÖVæFÖVçG2æ7&VFR‡²&öö¶–æt–C¢&öö¶–æræ–BÂââç&WVW7BÒ“°¢&WGW&âF†—2ævWDÖævVD&öö¶–ær†6öFRÂ66W75Fö¶Vâ“°¢Ğ ¢7–æ2Æ—7EVæF–ætÖVæFÖVçG2‚“¢&öÖ—6SÅ'FæW$ÖVæFÖVçE&V6÷&EµÓâ°¢6öç7BVæF–ærÒv—BF†—2æÖVæFÖVçG2æf–æEVæF–ær‚“°¢6öç7B&W7VÇG2Òv—B&öÖ—6RæÆÂ€¢VæF–æræÖ†7–æ2†ÖVæFÖVçB’Óâ°¢6öç7B²&öö¶–æt–BÂââçV&Æ–4ÖVæFÖVçBÒÒÖVæFÖVçC°¢6öç7B&öö¶–ærÒv—BF†—2æ&öö¶–æw2æf–æD'”–B†&öö¶–æt–B“°¢–b‚&öö¶–ær’&WGW&âVæFVf–æVC°¢6öç7B¶†÷FVÂÂV÷FUÒÒv—B&öÖ—6RæÆÂ…°¢F†—2æ†÷FVÇ2ævWD†÷FVÄ'•6ÇVr†&öö¶–æræ†÷FVÅ6ÇVr’À¢F†—2çV÷FW2æf–æD'”–B†&öö¶–ærçV÷FT–B’À¢Ò“°¢6öç7B&ööÒÒ†÷FVÃòç&öö×2æf–æB€¢†6æF–FFR’Óâ6æF–FFRç&ööÕG—T–BÓÓÒV÷FSòæf–Æ&–Æ—G”Æö6²ç&ööÕG—T–BÀ¢“°¢6öç7B&FUÆâÒ&ööÓòç&FUÆç2æf–æB‚†6æF–FFR’Óâ6æF–FFRæ–BÓÓÒV÷FSòç&FUÆä–B“°¢–b‚†÷FVÂÇÂV÷FRÇÂ&ööÒÇÂ&FUÆâ’&WGW&âVæFVf–æVC°¢&WGW&â°¢ââçV&Æ–4ÖVæFÖVçBÀ¢&öö¶–æs¢°¢6öæf—&ÖF–öä6öFS¢&öö¶–æræ6öæf—&ÖF–öä6öFRÀ¢7W'&Væ7“¢&öö¶–æræ7W'&Væ7’À¢7W'&VçD6†V6´–äFFS¢V÷FRæ6†V6´–äFFRÀ¢7W'&VçD6†V6´÷WDFFS¢V÷FRæ6†V6´÷WDFFRÀ¢7W'&VçEF÷FÄÖ÷VçC¢&öö¶–ærçF÷FÄÖ÷VçBÀ¢wVW7DæÖS¢G¶&öö¶–æræwVW7Bæf—'7DæÖWÒG¶&öö¶–æræwVW7BæÆ7DæÖWÖÀ¢†÷FVÄæÖS¢†÷FVÂææÖRÀ¢&FUÆäæÖS¢&FUÆâææÖRÀ¢&ööÔæÖS¢&ööÒææÖRÀ¢&öö×3¢V÷FRç&öö×2À¢ÒÀ¢Ò6F—6f–W2'FæW$ÖVæFÖVçE&V6÷&C°¢Ò’À¢“°¢&WGW&â&W7VÇG2æf–ÇFW"‚†—FVÒ“¢—FVÒ—2'FæW$ÖVæFÖVçE&V6÷&BÓâ—FVÒÓÒVæFVf–æVB“°¢Ğ ¢7–æ2Æ—7E'FæW$&öö¶–æw2€¢÷F–öç3¢²6¶—ó¢çVÖ&W#²F¶Só¢çVÖ&W"ÒÒ·ÒÀ¢“¢&öÖ—6SÅ'FæW$&öö¶–æu&V6÷&EµÓâ°¢6öç7B&öö¶–æw2Òv—BF†—2æ&öö¶–æw2æf–æDÆÂ†÷F–öç2“°¢6öç7B&W7VÇG2Òv—B&öÖ—6RæÆÂ€¢&öö¶–æw2æÖ†7–æ2†&öö¶–ær’Óâ°¢6öç7B¶†÷FVÂÂV÷FUÒÒv—B&öÖ—6RæÆÂ…°¢F†—2æ†÷FVÇ2ævWD†÷FVÄ'•6ÇVr†&öö¶–æræ†÷FVÅ6ÇVr’À¢F†—2çV÷FW2æf–æD'”–B†&öö¶–ærçV÷FT–B’À¢Ò“°¢6öç7B&ööÒÒ†÷FVÃòç&öö×2æf–æB€¢†6æF–FFR’Óâ6æF–FFRç&ööÕG—T–BÓÓÒV÷FSòæf–Æ&–Æ—G”Æö6²ç&ööÕG—T–BÀ¢“°¢6öç7B&FUÆâÒ&ööÓòç&FUÆç2æf–æB‚†6æF–FFR’Óâ6æF–FFRæ–BÓÓÒV÷FSòç&FUÆä–B“°¢–b‚†÷FVÂÇÂV÷FRÇÂ&ööÒÇÂ&FUÆâ’&WGW&âVæFVf–æVC°¢&WGW&â°¢6†V6´–äFFS¢V÷FRæ6†V6´–äFFRÀ¢6†V6´÷WDFFS¢V÷FRæ6†V6´÷WDFFRÀ¢6öæf—&ÖF–öä6öFS¢&öö¶–æræ6öæf—&ÖF–öä6öFRÀ¢7&VFVDC¢&öö¶–æræ7&VFVDBÀ¢7W'&Væ7“¢&öö¶–æræ7W'&Væ7’À¢wVW7DVÖ–Ã¢&öö¶–æræwVW7BæVÖ–ÂÀ¢wVW7DæÖS¢G¶&öö¶–æræwVW7Bæf—'7DæÖWÒG¶&öö¶–æræwVW7BæÆ7DæÖWÖÀ¢†÷FVÄæÖS¢†÷FVÂææÖRÀ¢–ÖVçE7FGW3¢&öö¶–ærç–ÖVçE7FGW2À¢&FUÆäæÖS¢&FUÆâææÖRÀ¢&ööÔæÖS¢&ööÒææÖRÀ¢&öö×3¢V÷FRç&öö×2À¢7FGW3¢&öö¶–ærç7FGW2À¢F÷FÄÖ÷VçC¢&öö¶–ærçF÷FÄÖ÷VçBÀ¢Ò6F—6f–W2'FæW$&öö¶–æu&V6÷&C°¢Ò’À¢“°¢&WGW&â&W7VÇG2æf–ÇFW"‚†&öö¶–ær“¢&öö¶–ær—2'FæW$&öö¶–æu&V6÷&BÓâ&öö¶–ærÓÒVæFVf–æVB“°¢Ğ ¢7–æ2vWE'FæW$&öö¶–æu7VÖÖ'’‚’°¢&WGW&âF†—2æ&öö¶–æw2ævWE'FæW%7VÖÖ'’‚“°¢Ğ ¢7–æ2vWE'FæW$–çfVçF÷'’€¢6†V6´–äFFS¢7G&–ærÀ¢6†V6´÷WDFFS¢7G&–ærÀ¢“¢&öÖ—6SÅ'FæW$–çfVçF÷'•&V6÷&EµÓâ°¢6öç7Bæ–v‡G2Ò6Æ7VÆFTæ–v‡G2†6†V6´–äFFRÂ6†V6´÷WDFFR“°¢6öç7BFöF’ÒæWrFFR‚’çFô•4õ7G&–ær‚’ç6Æ–6RƒÂ“°¢–b‚çVÖ&W"æ—4f–æ—FR†æ–v‡G2’ÇÂæ–v‡G2ÂÇÂ6†V6´–äFFRÂFöF’’°¢F‡&÷ræWr†÷FVÄ&öö¶–æu'VÆTW'&÷"€¢t”ådÄ”Eô”ådTåDõ%•ôDDU2rÀ¢t6†ö÷6RgWGW&RFFR&ævRöbBÆV7BöæRæ–v‡BârÀ¢“°¢Ğ ¢6öç7B†÷FVÇ2Òv—BF†—2æ†÷FVÇ2ævWD†÷FVÇ2‚“°¢6öç7B&V6÷&G2Òv—B&öÖ—6RæÆÂ€¢†÷FVÇ2æfÆDÖ‚††÷FVÂ’Óà¢†÷FVÂç&öö×2æÖ†7–æ2‡&ööÒ’Óâ°¢6öç7B&W6W'fVDÆö6·2Òv—BF†—2æÆö6·2æf–æE&W6W'fVD'•&ööÕG—R€¢&ööÒç&ööÕG—T–BÀ¢6†V6´–äFFRÀ¢6†V6´÷WDFFRÀ¢“°¢6öç7B7F—fT†öÆG2Ò&W6W'fVDÆö6·0¢æf–ÇFW"‚†Æö6²’ÓâÆö6²ç7FGW2ÓÓÒv7F—fRr¢ç&VGV6R‚‡F÷FÂÂÆö6²’ÓâF÷FÂ²Æö6²çVçF—G’Â“°¢6öç7BÆÆö6FVE&öö×2Ò&W6W'fVDÆö6·0¢æf–ÇFW"‚†Æö6²’ÓâÆö6²ç7FGW2ÓÓÒv6öçfW'FVBr¢ç&VGV6R‚‡F÷FÂÂÆö6²’ÓâF÷FÂ²Æö6²çVçF—G’Â“°¢6öç7B÷fW'&–FTÆ–Ö—BÒv—BF†—2æ–çfVçF÷'”÷fW'&–FW2æf–æDÆ–Ö—Df÷%7F’€¢&ööÒç&ööÕG—T–BÀ¢6†V6´–äFFRÀ¢6†V6´÷WDFFRÀ¢“°¢6öç7BVffV7F—fT–çfVçF÷'’ÒÖF‚æÖ–â€¢&ööÒæ–çfVçF÷'”6÷VçBÀ¢÷fW'&–FTÆ–Ö—Bóò&ööÒæ–çfVçF÷'”6÷VçBÀ¢“°¢&WGW&â°¢7F—fT†öÆG2À¢ÆÆö6FVE&öö×2À¢&6T–çfVçF÷'“¢&ööÒæ–çfVçF÷'”6÷VçBÀ¢VffV7F—fT–çfVçF÷'’À¢†÷FVÄæÖS¢†÷FVÂææÖRÀ¢–çfVçF÷'•6÷W&6S¢†÷FVÂæ–çfVçF÷'’ç6÷W&6RÀ¢÷fW'&–FTÆ–VC¢÷fW'&–FTÆ–Ö—BÓÒVæFVf–æVBÀ¢&VÖ–æ–æu&öö×3¢ÖF‚æÖ‚ƒÂVffV7F—fT–çfVçF÷'’Ò7F—fT†öÆG2ÒÆÆö6FVE&öö×2’À¢&ööÔæÖS¢&ööÒææÖRÀ¢&ööÕG—T–C¢&ööÒç&ööÕG—T–BÀ¢Ò6F—6f–W2'FæW$–çfVçF÷'•&V6÷&C°¢Ò’À¢’À¢“°¢&WGW&â&V6÷&G3°¢Ğ ¢7–æ26WE'FæW$–çfVçF÷'”÷fW'&–FR†–çWC¢°¢f–Æ&ÆU&öö×3¢çVÖ&W#°¢6†V6´–äFFS¢7G&–æs°¢6†V6´÷WDFFS¢7G&–æs°¢æ÷FS¢7G&–æs°¢&ööÕG—T–C¢7G&–æs°¢Ò“¢&öÖ—6SÅ'FæW$–çfVçF÷'•&V6÷&EµÓâ°¢6öç7Bæ–v‡G2Ò6Æ7VÆFTæ–v‡G2†–çWBæ6†V6´–äFFRÂ–çWBæ6†V6´÷WDFFR“°¢6öç7BFöF’ÒæWrFFR‚’çFô•4õ7G&–ær‚’ç6Æ–6RƒÂ“°¢–b‚çVÖ&W"æ—4f–æ—FR†æ–v‡G2’ÇÂæ–v‡G2ÂÇÂ–çWBæ6†V6´–äFFRÂFöF’’°¢F‡&÷ræWr†÷FVÄ&öö¶–æu'VÆTW'&÷"€¢t”ådÄ”Eô”ådTåDõ%•ôDDU2rÀ¢t6†ö÷6RgWGW&RFFR&ævRöbBÆV7BöæRæ–v‡BârÀ¢“°¢Ğ¢6öç7B†÷FVÇ2Òv—BF†—2æ†÷FVÇ2ævWD†÷FVÇ2‚“°¢6öç7B&ööÒÒ†÷FVÇ0¢æfÆDÖ‚††÷FVÂ’Óâ†÷FVÂç&öö×2¢æf–æB‚†6æF–FFR’Óâ6æF–FFRç&ööÕG—T–BÓÓÒ–çWBç&ööÕG—T–B“°¢–b‚&ööÒ¢F‡&÷ræWr†÷FVÄ&öö¶–æu'VÆTW'&÷"‚u$ôôÕôäõEôdõTäBrÂuF†R&ööÒG—R6÷VÆBæ÷B&Rf÷VæBâr“°¢–b€¢çVÖ&W"æ—4–çFVvW"†–çWBæf–Æ&ÆU&öö×2’ÇÀ¢–çWBæf–Æ&ÆU&öö×2ÂÇÀ¢–çWBæf–Æ&ÆU&öö×2â&ööÒæ–çfVçF÷'”6÷Vç@¢’°¢F‡&÷ræWr†÷FVÄ&öö¶–æu'VÆTW'&÷"€¢t”ådÄ”Eô”ådTåDõ%•ôÄ”Ô•BrÀ¢f–Æ&ÆR&öö×2×W7B&R&WGvVVâæBG·&ööÒæ–çfVçF÷'”6÷VçGÒæÀ¢“°¢Ğ¢v—BF†—2æ–çfVçF÷'”÷fW'&–FW2ç6WE&ævR†–çWB“°¢&WGW&âF†—2ævWE'FæW$–çfVçF÷'’†–çWBæ6†V6´–äFFRÂ–çWBæ6†V6´÷WDFFR“°¢Ğ ¢7–æ2&Wf–WtÖVæFÖVçB€¢–C¢7G&–ærÀ¢FV6—6–öã¢v&÷fVBrÂvFV6Æ–æVBrÀ¢&Wf–Wtæ÷FS¢7G&–ærÀ¢“¢&öÖ—6SÄ&öö¶–ætÖVæFÖVçE&V6÷&BÂVæFVf–æVCâ°¢6öç7BVæF–ærÒ†v—BF†—2æÖVæFÖVçG2æf–æEVæF–ær‚’’æf–æB‚†—FVÒ’Óâ—FVÒæ–BÓÓÒ–B“°¢–b‚VæF–ær’&WGW&âVæFVf–æVC°¢–b†FV6—6–öâÓÓÒvFV6Æ–æVBr’°¢&WGW&âF†—2æÖVæFÖVçG2æFV6Æ–æR†–BÂ&Wf–Wtæ÷FR“°¢Ğ ¢6öç7B&öö¶–ærÒv—BF†—2æ&öö¶–æw2æf–æD'”–B‡VæF–æræ&öö¶–æt–B“°¢–b‚&öö¶–ærÇÂ&öö¶–ærç7FGW2ÓÒv6öæf—&ÖVBr’°¢F‡&÷ræWr†÷FVÄ&öö¶–æu'VÆTW'&÷"€¢t$ôô´”äuôäõEôÔTäD$ÄRrÀ¢uF†R&öö¶–ær—2æòÆöævW"ÖVæF&ÆRârÀ¢“°¢Ğ¢6öç7Bæ–v‡G2Ò6Æ7VÆFTæ–v‡G2‡VæF–ærç&WVW7FVD6†V6´–äFFRÂVæF–ærç&WVW7FVD6†V6´÷WDFFR“°¢6öç7BFöF’ÒæWrFFR‚’çFô•4õ7G&–ær‚’ç6Æ–6RƒÂ“°¢–b‚çVÖ&W"æ—4f–æ—FR†æ–v‡G2’ÇÂæ–v‡G2ÂÇÂVæF–ærç&WVW7FVD6†V6´–äFFRÂFöF’’°¢F‡&÷ræWr†÷FVÄ&öö¶–æu'VÆTW'&÷"€¢t”ådÄ”EôÔTäDÔTåEôDDU2rÀ¢uF†R&WVW7FVB7F’FFW2&RæòÆöævW"fÆ–BârÀ¢“°¢Ğ¢6öç7B¶†÷FVÂÂV÷FUÒÒv—B&öÖ—6RæÆÂ…°¢F†—2æ†÷FVÇ2ævWD†÷FVÄ'•6ÇVr†&öö¶–æræ†÷FVÅ6ÇVr’À¢F†—2çV÷FW2æf–æD'”–B†&öö¶–ærçV÷FT–B’À¢Ò“°¢6öç7B&ööÒÒ†÷FVÃòç&öö×2æf–æB€¢†6æF–FFR’Óâ6æF–FFRç&ööÕG—T–BÓÓÒV÷FSòæf–Æ&–Æ—G”Æö6²ç&ööÕG—T–BÀ¢“°¢6öç7B&FUÆâÒ&ööÓòç&FUÆç2æf–æB‚†6æF–FFR’Óâ6æF–FFRæ–BÓÓÒV÷FSòç&FUÆä–B“°¢–b‚†÷FVÂÇÂV÷FRÇÂ&ööÒÇÂ&FUÆâ’°¢F‡&÷ræWr†÷FVÄ&öö¶–æu'VÆTW'&÷"€¢u$DUõTäd”Ä$ÄRrÀ¢uF†R÷&–v–æÂ&ööÒ÷"&FR—2Væf–Æ&ÆRârÀ¢“°¢Ğ ¢6öç7B&W6W'fVDÆö6·2Òv—BF†—2æÆö6·2æf–æE&W6W'fVD'•&ööÕG—R€¢&ööÒç&ööÕG—T–BÀ¢VæF–ærç&WVW7FVD6†V6´–äFFRÀ¢VæF–ærç&WVW7FVD6†V6´÷WDFFRÀ¢“°¢6öç7B÷F†W%&W6W'fVE&öö×2Ò&W6W'fVDÆö6·0¢æf–ÇFW"‚†Æö6²’ÓâÆö6²æ–BÓÒ&öö¶–æræf–Æ&–Æ—G”Æö6´–B¢ç&VGV6R‚‡F÷FÂÂÆö6²’ÓâF÷FÂ²Æö6²çVçF—G’Â“°¢6öç7B÷fW'&–FTÆ–Ö—BÒv—BF†—2æ–çfVçF÷'”÷fW'&–FW2æf–æDÆ–Ö—Df÷%7F’€¢&ööÒç&ööÕG—T–BÀ¢VæF–ærç&WVW7FVD6†V6´–äFFRÀ¢VæF–ærç&WVW7FVD6†V6´÷WDFFRÀ¢“°¢6öç7BVffV7F—fT–çfVçF÷'’ÒÖF‚æÖ–â‡&ööÒæ–çfVçF÷'”6÷VçBÂ÷fW'&–FTÆ–Ö—Bóò&ööÒæ–çfVçF÷'”6÷VçB“°¢–b†VffV7F—fT–çfVçF÷'’Ò÷F†W%&W6W'fVE&öö×2ÂV÷FRç&öö×2’°¢F‡&÷ræWr†÷FVÄ&öö¶–æu'VÆTW'&÷"€¢t”ådTåDõ%•ôäõEôd”Ä$ÄRrÀ¢uF†R&WVW7FVBFFW2æòÆöævW"†fR7Vff–6–VçB–çfVçF÷'’ârÀ¢“°¢Ğ ¢6öç7B&ööÔ6†&vTÖ÷VçBÒ&FUÆâææ–v‡FÇ•&FRæÖ÷VçB¢æ–v‡G2¢V÷FRç&öö×3°¢6öç7BF„æDfVTÖ÷VçBÒ&FUÆâçF†W4æDfVW2æÖ÷VçB¢æ–v‡G2¢V÷FRç&öö×3°¢6öç7B&–6T6ö×öæVçG3¢&–6T6ö×öæVçEµÒÒ°¢°¢Ö÷VçC¢&ööÔ6†&vTÖ÷VçBÀ¢7W'&Væ7“¢&FUÆâææ–v‡FÇ•&FRæ7W'&Væ7’À¢Æ&VÃ¢G·V÷FRç&öö×7Ò&ööÒG·V÷FRç&öö×2ÓÓÒòrr¢w2wÒ9rG¶æ–v‡G7Òæ–v‡BG¶æ–v‡G2ÓÓÒòrr¢w2wÖÀ¢G—S¢w&ööÒÖ6†&vRrÀ¢ÒÀ¢°¢Ö÷VçC¢F„æDfVTÖ÷VçBÀ¢7W'&Væ7“¢&FUÆâçF†W4æDfVW2æ7W'&Væ7’À¢Æ&VÃ¢uF†W2æBfVW2rÀ¢G—S¢wF‚ÖæBÖfVRrÀ¢ÒÀ¢Ó°¢&WGW&âF†—2æÖVæFÖVçG2æ&÷fR†–BÂ°¢6†V6´–äFFS¢VæF–ærç&WVW7FVD6†V6´–äFFRÀ¢6†V6´÷WDFFS¢VæF–ærç&WVW7FVD6†V6´÷WDFFRÀ¢æ–v‡G2À¢&–6T6ö×öæVçG2À¢&Wf–Wtæ÷FRÀ¢F÷FÄÖ÷VçC¢&ööÔ6†&vTÖ÷VçB²F„æDfVTÖ÷VçBÀ¢Ò“°¢Ğ§Ğ ¦W‡÷'B6öç7B†÷FVÄ&öö¶–æu6W'f–6RÒæWr†÷FVÄ&öö¶–æu6W'f–6R‚“°