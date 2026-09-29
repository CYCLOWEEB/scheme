export interface OfficialScaRecord {
  state: string;
  name: string;
  address: string;
}

// Transcribed from the official NSFDC state/UT SCA directory, refreshed 1 April 2026.
export const OFFICIAL_SCA_SOURCE = 'https://nsfdc.nic.in/storage/channel-partners/attachments/20260401_164458_Ip6UJm.pdf';

export const OFFICIAL_SCA_DIRECTORY: OfficialScaRecord[] = [
  { state: 'Andhra Pradesh', name: 'Andhra Pradesh Scheduled Castes Cooperative Finance Corporation Ltd. (APSCCFC)', address: 'SP River View Apartments, 3rd Floor, Tadepalli, Amaravathi – 522 501.' },
  { state: 'Andhra Pradesh', name: 'Andhra Pradesh State Financial Corporation (APSFC)', address: 'APSFC Building, Plot OS No. 2, 2nd Cross, 3rd Road, Industrial Park, Vijayawada – 520 007.' },
  { state: 'Assam', name: 'Assam State Development Corporation for SCs Ltd. (ASCDC)', address: 'Swahid Dilip Hozori Path, Sarumotoria, Dispur, Guwahati – 781 006.' },
  { state: 'Bihar', name: 'Bihar State SCs Co-operative Development Corporation Ltd. (BSSCCDC)', address: 'RN-212, Officers Colony (Block-A), Bailey Road, Patna – 800 001.' },
  { state: 'Chandigarh', name: 'Chandigarh SCs, BCs & Minorities Financial & Development Corporation Ltd. (CSCFDC)', address: '3rd Floor, Additional Town Hall Building, Sector-17-C, Chandigarh – 160 017.' },
  { state: 'Chhattisgarh', name: 'Chhattisgarh State Antavasayee Sahkari Finance & Development Corporation (CGSCFDC)', address: '4th Floor, Business Complex, Chhattisgarh Housing Board Bhawan, Nava Raipur – 492 101.' },
  { state: 'Dadra and Nagar Haveli and Daman and Diu', name: 'Dadra & Nagar Haveli, Daman & Diu SCs/STs/OBCs & Minorities Financial & Development Corporation (DNDSFDC)', address: 'Ground Floor, Right Wing, New Collectorate Building, near Electricity Department, Silvassa – 396 230.' },
  { state: 'Delhi', name: 'Delhi SC/ST/OBC/Minorities & Handicapped Financial & Development Corporation (DSFDC)', address: 'Ambedkar Bhawan, Sector-16 (opposite Sector-11), Rohini, Delhi – 110 085.' },
  { state: 'Gujarat', name: 'Gujarat SCs Development Corporation (GSCDC)', address: 'Dr Jivraj Mehta Bhawan, Block 10, 2nd Floor, Old Sachivalaya, Gandhinagar – 382 010.' },
  { state: 'Gujarat', name: 'Dr. Ambedkar Antyodaya Vikas Nigam (S.C.) (DAAVN)', address: 'Karmayogi Bhavan, Block 2, D-2 Wing, 4th Floor, Sector 10/B, Gandhinagar.' },
  { state: 'Goa', name: 'Goa State SCs & OBCs Finance and Development Corporation Ltd. (GSCOBCDC)', address: '4th Floor, Patto Centre, near K.T.C. Bus Stand, Panaji – 403 001.' },
  { state: 'Haryana', name: 'Haryana SCs Finance and Development Corporation Ltd. (HSCDC)', address: 'SCO-2427-28, Sector 22-C, Chandigarh – 160 022.' },
  { state: 'Himachal Pradesh', name: 'Himachal Pradesh SCs & STs Development Corporation (HPSCSTDC)', address: 'Kalyan Bhawan, near Ambusha Resort, Solan – 173 212.' },
  { state: 'Jharkhand', name: 'Jharkhand State Scheduled Castes Cooperative Development Corporation (JSCDC)', address: 'Kalyan Complex, 3rd Floor, Balihar Road, Morabadi, Ranchi – 834 008.' },
  { state: 'Jammu and Kashmir', name: 'J&K SCs, STs & OBCs Development Corporation Ltd. (JKSCSTBCDC)', address: 'Exchange Road, near Red Cross Office, Srinagar – 190 001 (May–October); 135-A, Last Morh, Gandhi Nagar, Jammu – 180 004 (November–April).' },
  { state: 'Karnataka', name: 'Dr. B. R. Ambedkar Development Corporation Ltd. (DBRADC)', address: '9th & 10th Floor, Vishveshwariah Mini Tower, Dr. Ambedkar Veedhi, Bengaluru – 560 001.' },
  { state: 'Kerala', name: 'Kerala State Development Corporation for SCs & STs Ltd. (KSDC)', address: 'Town Hall Road, Thrissur – 680 020.' },
  { state: 'Kerala', name: 'Kerala State Women’s Development Corporation (KSWDC)', address: '1st Floor, Transport Bhavan, KSRTC Building, East Fort, Attakulangara – 695 023.' },
  { state: 'Madhya Pradesh', name: 'MP State Cooperative SC Finance & Development Corporation (MPSCFDC)', address: 'Rajiv Gandhi Bhawan, 35, Shyamala Hills, Bhopal – 462 011.' },
  { state: 'Maharashtra', name: 'Mahatma Phule BCs Development Corporation Ltd. (MPBCDC)', address: '1-N, Supreme Shopping Centre, Gulmohar Cross Road No. 9, J.V.P.D. Scheme, Juhu, Mumbai – 400 049.' },
  { state: 'Maharashtra', name: 'Sahityaratna Lokshahir Annabhau Sathe Development Corporation Ltd. (SLASDC)', address: 'New Administration Building No. 2, 3rd Floor, Ramkrushna Chemburkar Marg, Chembur (East), Mumbai – 400 071.' },
  { state: 'Maharashtra', name: 'Sant Rohidas Leather Industries & Charmakar Development Corporation (LIDCOM)', address: 'Bombay Life Building, 5th Floor, 45, Veer Nariman Road, Mumbai – 400 001.' },
  { state: 'Manipur', name: 'Manipur Tribal Development Corporation Ltd. (MTDC)', address: 'Lamphelpat, Imphal – 795 004.' },
  { state: 'Manipur', name: 'Manipur SCs & STs Co-operative Development Bank (MSTCB)', address: 'Nambun Long, Stadium Road, Imphal East, Manipur – 795 001.' },
  { state: 'Meghalaya', name: 'Meghalaya Cooperative Apex Bank Ltd. (MCAB)', address: 'M.G. Road, Kutchery, Shillong – 793 001.' },
  { state: 'Mizoram', name: 'Mizoram Urban Cooperative Development Bank Ltd. (MUCO Bank)', address: 'Lawlsawmiliani Building (Top Floor), Zarkawt, Aizawl – 796 001.' },
  { state: 'Mizoram', name: 'Mizoram Khadi & Village Industries Board (MKVIB)', address: '“Zorun”, Zarkawt, Aizawl – 796 007.' },
  { state: 'Odisha', name: 'Odisha SCs & STs Development Finance Co-operative Corporation Ltd. (OSFDC)', address: 'Lewis Road, Bhubaneswar – 751 014.' },
  { state: 'Puducherry', name: 'Puducherry Adi Dravidar Development Corporation Ltd. (PADCO)', address: '3rd Floor, Directorate of Adi Dravidar Welfare Department, Thattanchavady, Puducherry – 605 009.' },
  { state: 'Punjab', name: 'Punjab Scheduled Castes Land Development & Finance Corporation (PSCLDFC)', address: 'SCO 101-103, Sector 17-C, Chandigarh – 160 017.' },
  { state: 'Rajasthan', name: 'Rajasthan SCs & STs Finance & Development Co-operative Corporation Ltd. (RSCDC)', address: '3rd Floor, Central Block, Nehru Sahakar Bhawan, Bhawani Singh Marg, Jaipur – 302 005.' },
  { state: 'Sikkim', name: 'Sikkim Scheduled Castes, Scheduled Tribes & Backward Classes Development Corporation (SSCSTBCDC)', address: 'Bhanupath, Gangtok – 737 101.' },
  { state: 'Tamil Nadu', name: 'Tamil Nadu Adi Dravidar Housing & Development Corporation Ltd. (TAHDCO)', address: 'No. 31, Cenotaph Road, 2nd Lane, Teynampet, Chennai – 600 018.' },
  { state: 'Tripura', name: 'Tripura Scheduled Castes Co-operative Development Corporation Ltd. (TSCDC)', address: 'Krishna Nagar P.O., Lake Chowmuhani, Agartala – 799 001.' },
  { state: 'Uttarakhand', name: 'Uttarakhand Bahu-udeshiya Vitta Evam Vikas Nigam (UBVEVN)', address: 'Janjati Directorate, New Building, Bhagat Singh Colony (Adhoiwala), Dehradun – 248 001.' },
  { state: 'Uttar Pradesh', name: 'UP Sahkari Gram Vikas Bank Ltd.', address: '10, Mall Avenue, Lucknow – 226 001.' },
  { state: 'Uttar Pradesh', name: 'UP Scheduled Castes Finance & Development Corporation Ltd. (UPSCFDC)', address: 'B-912, Sector-C, Mahanagar, Lucknow – 226 006.' },
  { state: 'West Bengal', name: 'West Bengal SCs, STs & OBC Development & Finance Corporation (WBSCSTOBCDFC)', address: 'CF 217/A/1, Salt Lake, Sector I (Mangolic Building), Kolkata – 700 064.' },
];
