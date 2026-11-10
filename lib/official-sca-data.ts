export interface OfficialScaRecord {
  state: string;
  name: string;
  address: string;
  /** Approximate locality anchors for the map; directions still use the published address. */
  mapLocations: OfficialScaMapLocation[];
}

export interface OfficialScaMapLocation {
  label: string;
  coordinates: [latitude: number, longitude: number];
  /** Used when an agency has separate seasonal or satellite offices. */
  directionsAddress?: string;
}

// Transcribed from the official NSFDC state/UT SCA directory, refreshed 1 April 2026.
export const OFFICIAL_SCA_SOURCE = 'https://nsfdc.nic.in/storage/channel-partners/attachments/20260401_164458_Ip6UJm.pdf';

export const OFFICIAL_SCA_DIRECTORY: OfficialScaRecord[] = [
  { state: 'Andhra Pradesh', name: 'Andhra Pradesh Scheduled Castes Cooperative Finance Corporation Ltd. (APSCCFC)', address: 'SP River View Apartments, 3rd Floor, Tadepalli, Amaravathi – 522 501.', mapLocations: [{ label: 'Tadepalli, Amaravathi', coordinates: [16.4801, 80.6006] }] },
  { state: 'Andhra Pradesh', name: 'Andhra Pradesh State Financial Corporation (APSFC)', address: 'APSFC Building, Plot OS No. 2, 2nd Cross, 3rd Road, Industrial Park, Vijayawada – 520 007.', mapLocations: [{ label: 'Vijayawada', coordinates: [16.5062, 80.648] }] },
  { state: 'Assam', name: 'Assam State Development Corporation for SCs Ltd. (ASCDC)', address: 'Swahid Dilip Hozori Path, Sarumotoria, Dispur, Guwahati – 781 006.', mapLocations: [{ label: 'Dispur, Guwahati', coordinates: [26.1433, 91.7898] }] },
  { state: 'Bihar', name: 'Bihar State SCs Co-operative Development Corporation Ltd. (BSSCCDC)', address: 'RN-212, Officers Colony (Block-A), Bailey Road, Patna – 800 001.', mapLocations: [{ label: 'Bailey Road, Patna', coordinates: [25.6099, 85.1072] }] },
  { state: 'Chandigarh', name: 'Chandigarh SCs, BCs & Minorities Financial & Development Corporation Ltd. (CSCFDC)', address: '3rd Floor, Additional Town Hall Building, Sector-17-C, Chandigarh – 160 017.', mapLocations: [{ label: 'Sector 17-C, Chandigarh', coordinates: [30.7391, 76.7828] }] },
  { state: 'Chhattisgarh', name: 'Chhattisgarh State Antavasayee Sahkari Finance & Development Corporation (CGSCFDC)', address: '4th Floor, Business Complex, Chhattisgarh Housing Board Bhawan, Nava Raipur – 492 101.', mapLocations: [{ label: 'Nava Raipur', coordinates: [21.1594, 81.7812] }] },
  { state: 'Dadra and Nagar Haveli and Daman and Diu', name: 'Dadra & Nagar Haveli, Daman & Diu SCs/STs/OBCs & Minorities Financial & Development Corporation (DNDSFDC)', address: 'Ground Floor, Right Wing, New Collectorate Building, near Electricity Department, Silvassa – 396 230.', mapLocations: [{ label: 'Silvassa', coordinates: [20.2734, 72.9967] }] },
  { state: 'Delhi', name: 'Delhi SC/ST/OBC/Minorities & Handicapped Financial & Development Corporation (DSFDC)', address: 'Ambedkar Bhawan, Sector-16 (opposite Sector-11), Rohini, Delhi – 110 085.', mapLocations: [{ label: 'Rohini, Delhi', coordinates: [28.7388, 77.1067] }] },
  { state: 'Gujarat', name: 'Gujarat SCs Development Corporation (GSCDC)', address: 'Dr Jivraj Mehta Bhawan, Block 10, 2nd Floor, Old Sachivalaya, Gandhinagar – 382 010.', mapLocations: [{ label: 'Old Sachivalaya, Gandhinagar', coordinates: [23.2193, 72.6492] }] },
  { state: 'Gujarat', name: 'Dr. Ambedkar Antyodaya Vikas Nigam (S.C.) (DAAVN)', address: 'Karmayogi Bhavan, Block 2, D-2 Wing, 4th Floor, Sector 10/B, Gandhinagar.', mapLocations: [{ label: 'Sector 10/B, Gandhinagar', coordinates: [23.2105, 72.6366] }] },
  { state: 'Goa', name: 'Goa State SCs & OBCs Finance and Development Corporation Ltd. (GSCOBCDC)', address: '4th Floor, Patto Centre, near K.T.C. Bus Stand, Panaji – 403 001.', mapLocations: [{ label: 'Patto, Panaji', coordinates: [15.4985, 73.8291] }] },
  { state: 'Haryana', name: 'Haryana SCs Finance and Development Corporation Ltd. (HSCDC)', address: 'SCO-2427-28, Sector 22-C, Chandigarh – 160 022.', mapLocations: [{ label: 'Sector 22-C, Chandigarh', coordinates: [30.7295, 76.7682] }] },
  { state: 'Himachal Pradesh', name: 'Himachal Pradesh SCs & STs Development Corporation (HPSCSTDC)', address: 'Kalyan Bhawan, near Ambusha Resort, Solan – 173 212.', mapLocations: [{ label: 'Solan', coordinates: [30.9127, 77.0962] }] },
  { state: 'Jharkhand', name: 'Jharkhand State Scheduled Castes Cooperative Development Corporation (JSCDC)', address: 'Kalyan Complex, 3rd Floor, Balihar Road, Morabadi, Ranchi – 834 008.', mapLocations: [{ label: 'Morabadi, Ranchi', coordinates: [23.4021, 85.3168] }] },
  { state: 'Jammu and Kashmir', name: 'J&K SCs, STs & OBCs Development Corporation Ltd. (JKSCSTBCDC)', address: 'Exchange Road, near Red Cross Office, Srinagar – 190 001 (May–October); 135-A, Last Morh, Gandhi Nagar, Jammu – 180 004 (November–April).', mapLocations: [{ label: 'Srinagar office (May–October)', coordinates: [34.0686, 74.8385], directionsAddress: 'Exchange Road, near Red Cross Office, Srinagar – 190 001' }, { label: 'Jammu office (November–April)', coordinates: [32.7065, 74.8671], directionsAddress: '135-A, Last Morh, Gandhi Nagar, Jammu – 180 004' }] },
  { state: 'Karnataka', name: 'Dr. B. R. Ambedkar Development Corporation Ltd. (DBRADC)', address: '9th & 10th Floor, Vishveshwariah Mini Tower, Dr. Ambedkar Veedhi, Bengaluru – 560 001.', mapLocations: [{ label: 'Dr. Ambedkar Veedhi, Bengaluru', coordinates: [12.9764, 77.5929] }] },
  { state: 'Kerala', name: 'Kerala State Development Corporation for SCs & STs Ltd. (KSDC)', address: 'Town Hall Road, Thrissur – 680 020.', mapLocations: [{ label: 'Town Hall Road, Thrissur', coordinates: [10.5276, 76.2144] }] },
  { state: 'Kerala', name: 'Kerala State Women’s Development Corporation (KSWDC)', address: '1st Floor, Transport Bhavan, KSRTC Building, East Fort, Attakulangara – 695 023.', mapLocations: [{ label: 'East Fort, Thiruvananthapuram', coordinates: [8.4734, 76.9497] }] },
  { state: 'Madhya Pradesh', name: 'MP State Cooperative SC Finance & Development Corporation (MPSCFDC)', address: 'Rajiv Gandhi Bhawan, 35, Shyamala Hills, Bhopal – 462 011.', mapLocations: [{ label: 'Shyamala Hills, Bhopal', coordinates: [23.2484, 77.3894] }] },
  { state: 'Maharashtra', name: 'Mahatma Phule BCs Development Corporation Ltd. (MPBCDC)', address: '1-N, Supreme Shopping Centre, Gulmohar Cross Road No. 9, J.V.P.D. Scheme, Juhu, Mumbai – 400 049.', mapLocations: [{ label: 'Juhu, Mumbai', coordinates: [19.1075, 72.8258] }] },
  { state: 'Maharashtra', name: 'Sahityaratna Lokshahir Annabhau Sathe Development Corporation Ltd. (SLASDC)', address: 'New Administration Building No. 2, 3rd Floor, Ramkrushna Chemburkar Marg, Chembur (East), Mumbai – 400 071.', mapLocations: [{ label: 'Chembur East, Mumbai', coordinates: [19.0618, 72.8972] }] },
  { state: 'Maharashtra', name: 'Sant Rohidas Leather Industries & Charmakar Development Corporation (LIDCOM)', address: 'Bombay Life Building, 5th Floor, 45, Veer Nariman Road, Mumbai – 400 001.', mapLocations: [{ label: 'Fort, Mumbai', coordinates: [18.9296, 72.8317] }] },
  { state: 'Manipur', name: 'Manipur Tribal Development Corporation Ltd. (MTDC)', address: 'Lamphelpat, Imphal – 795 004.', mapLocations: [{ label: 'Lamphelpat, Imphal', coordinates: [24.817, 93.9225] }] },
  { state: 'Manipur', name: 'Manipur SCs & STs Co-operative Development Bank (MSTCB)', address: 'Nambun Long, Stadium Road, Imphal East, Manipur – 795 001.', mapLocations: [{ label: 'Imphal East', coordinates: [24.8045, 93.9629] }] },
  { state: 'Meghalaya', name: 'Meghalaya Cooperative Apex Bank Ltd. (MCAB)', address: 'M.G. Road, Kutchery, Shillong – 793 001.', mapLocations: [{ label: 'Shillong', coordinates: [25.5788, 91.8933] }] },
  { state: 'Mizoram', name: 'Mizoram Urban Cooperative Development Bank Ltd. (MUCO Bank)', address: 'Lawlsawmiliani Building (Top Floor), Zarkawt, Aizawl – 796 001.', mapLocations: [{ label: 'Zarkawt, Aizawl', coordinates: [23.7345, 92.7184] }] },
  { state: 'Mizoram', name: 'Mizoram Khadi & Village Industries Board (MKVIB)', address: '“Zorun”, Zarkawt, Aizawl – 796 007.', mapLocations: [{ label: 'Zarkawt, Aizawl', coordinates: [23.735, 92.719] }] },
  { state: 'Odisha', name: 'Odisha SCs & STs Development Finance Co-operative Corporation Ltd. (OSFDC)', address: 'Lewis Road, Bhubaneswar – 751 014.', mapLocations: [{ label: 'Lewis Road, Bhubaneswar', coordinates: [20.2537, 85.8412] }] },
  { state: 'Puducherry', name: 'Puducherry Adi Dravidar Development Corporation Ltd. (PADCO)', address: '3rd Floor, Directorate of Adi Dravidar Welfare Department, Thattanchavady, Puducherry – 605 009.', mapLocations: [{ label: 'Thattanchavady, Puducherry', coordinates: [11.946, 79.8008] }] },
  { state: 'Punjab', name: 'Punjab Scheduled Castes Land Development & Finance Corporation (PSCLDFC)', address: 'SCO 101-103, Sector 17-C, Chandigarh – 160 017.', mapLocations: [{ label: 'Sector 17-C, Chandigarh', coordinates: [30.7391, 76.7828] }] },
  { state: 'Rajasthan', name: 'Rajasthan SCs & STs Finance & Development Co-operative Corporation Ltd. (RSCDC)', address: '3rd Floor, Central Block, Nehru Sahakar Bhawan, Bhawani Singh Marg, Jaipur – 302 005.', mapLocations: [{ label: 'Jaipur', coordinates: [26.8956, 75.8064] }] },
  { state: 'Sikkim', name: 'Sikkim Scheduled Castes, Scheduled Tribes & Backward Classes Development Corporation (SSCSTBCDC)', address: 'Bhanupath, Gangtok – 737 101.', mapLocations: [{ label: 'Bhanupath, Gangtok', coordinates: [27.329, 88.612] }] },
  { state: 'Tamil Nadu', name: 'Tamil Nadu Adi Dravidar Housing & Development Corporation Ltd. (TAHDCO)', address: 'No. 31, Cenotaph Road, 2nd Lane, Teynampet, Chennai – 600 018.', mapLocations: [{ label: 'Teynampet, Chennai', coordinates: [13.0367, 80.2487] }] },
  { state: 'Tripura', name: 'Tripura Scheduled Castes Co-operative Development Corporation Ltd. (TSCDC)', address: 'Krishna Nagar P.O., Lake Chowmuhani, Agartala – 799 001.', mapLocations: [{ label: 'Agartala', coordinates: [23.8357, 91.2784] }] },
  { state: 'Uttarakhand', name: 'Uttarakhand Bahu-udeshiya Vitta Evam Vikas Nigam (UBVEVN)', address: 'Janjati Directorate, New Building, Bhagat Singh Colony (Adhoiwala), Dehradun – 248 001.', mapLocations: [{ label: 'Adhoiwala, Dehradun', coordinates: [30.3318, 78.0649] }] },
  { state: 'Uttar Pradesh', name: 'UP Sahkari Gram Vikas Bank Ltd.', address: '10, Mall Avenue, Lucknow – 226 001.', mapLocations: [{ label: 'Mall Avenue, Lucknow', coordinates: [26.8467, 80.9351] }] },
  { state: 'Uttar Pradesh', name: 'UP Scheduled Castes Finance & Development Corporation Ltd. (UPSCFDC)', address: 'B-912, Sector-C, Mahanagar, Lucknow – 226 006.', mapLocations: [{ label: 'Mahanagar, Lucknow', coordinates: [26.8789, 80.9462] }] },
  { state: 'West Bengal', name: 'West Bengal SCs, STs & OBC Development & Finance Corporation (WBSCSTOBCDFC)', address: 'CF 217/A/1, Salt Lake, Sector I (Mangolic Building), Kolkata – 700 064.', mapLocations: [{ label: 'Salt Lake Sector I, Kolkata', coordinates: [22.5856, 88.411] }] },
];
